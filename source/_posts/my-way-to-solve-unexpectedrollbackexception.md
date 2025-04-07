---
categories:
  - - 编程
    - Java
    - Spring
title: 记一次UnexceptedRollbackException解决过程
abbrlink: 955282ec
date: 2025-12-01 00:00:00
---

项目内有一个api方法（称之为 `ServiceA.methodA()` ）需要调用一个共通service里的方法（称之为 `CommonService.methodB()` ），然后由于业务需求需要catch住 `CommonService.methodB()` 的异常并返回response。

由于项目在config里通过切面配置了对于所有的 `@Service` 都设置了默认事务为REQUIRED，并且设置了对所有异常都回滚（通过 `TransactionInterceptor` 和 `NameMatchTransactionAttributeSource` ），导致如果直接使用 `CommonService.methodB()` 的话就会因为spring的机制导致抛出UnexceptedRollbackException。

这个机制具体来说，抛出异常时spring会检测到并将当前事务内部的 `rollbackOnly` 这样一个flag设为true。但是又因为catch住了异常，导致最后结束方法提交事务时spring发现这个flag为true却仍然要提交，于是兜底性的回滚了并抛出UnexceptedRollbackException。

于是我想到了新建事务执行，而项目内正好有一个空壳方法 `Helper.execute(Suppiler)` 上面加了REQUIRES_NEW，只需代入方法即可。

```java
try {
    result = Helper.execute(() -> commonService.methodB());
catch (Exception e) {
    return response;
}
```

但测试后发现仍然还是会抛出UnexceptedRollbackException。这就要具体分析整个流程了：

1. Api (`ServiceA`) 调用 `Helper.execute()`，此时环境是 Tx1，对应拦截器（指 `TransactionInterceptor`  ）是拦截器1（用的是 `NameMatchTransactionAttributeSource` ）。
2. `Helper` 上有 `@Service` ，拦截器2介入（用的是 `NameMatchTransactionAttributeSource` ）：
    1. 它看到`ServiceA`有Tx1，
    2. 它配置默认使用 REQUIRED。
    3. 所以它让 `Helper` 加入了 Tx1。
3. `Helper.execute` 上有 `@Transactional(propagation = Propagation.REQUIRES_NEW)` ，拦截器3介入（用的是 `AnnotationTransactionAttributeSource` ）：
    1. 它看到 REQUIRES_NEW。
    2. 它调用 `tm.suspend(Tx1)` ，挂起 Tx1。
    3. 它调用 `tm.begin()` ，开启 Tx2。
4. 执行业务：
    1. `CommonService` 报错，抛出 `BusinessRuntimeException`。
5. 拦截器3捕获异常：
    1. 它持有 Tx2。
    2. 它执行 `tm.rollback(Tx2)` ，Tx2干净地回滚了。
    3. 它执行 `tm.resume(Tx1)`，Tx1恢复了。
    4. 关键动作：它必须把异常继续往外抛（因为 AOP 默认行为就是处理完事务抛出异常）。
    5. 抛出 `MyBusinessRuntimeException`。
6. 拦截器2捕获异常：
    1.  它接到了注解拦截器抛出来的异常。
    2. 它持有 Tx1 (因为它之前加入了 Tx1)。
    3. 它检查回滚规则：RuntimeException -> 需要回滚。
    4. 它执行 `tm.rollback(Tx1)` 这里的逻辑。
    5. **但是因为它只是一个“参与者”（Propgation.REQUIRED），它没有资格直接物理回滚 Tx1，它只能通知上级（也就是拦截器1），通过 `status.setRollbackOnly()`。**
    6. 结果：Tx1 被打上了必须回滚的标签。
    7. 它继续把异常抛给 Api。
7. 回到 Api (ServiceA)：
    1. Catch 住了异常。
    2. Api 觉得“没问题了”，方法正常结束。
    3. Spring 试图 `tm.commit(Tx1)`。
    4. 发现 Tx1 身上有全局拦截器贴的 `RollbackOnly` 标签。
    5. 抛出异常 `UnexpectedRollbackException`。

> 关于参与者，是因为Spring 事务管理遵循一个基本原则：“谁开启，谁负责（物理）提交/回滚”。只有最外层开启事务的方法，才持有真正的数据库连接（Connection），才有资格调用 JDBC 的 `con.rollback()` 或 `con.commit()`。具体在spring源码中可以看到：
> 

```java
// org.springframework.transaction.support.AbstractPlatformTransactionManager

private void processRollback(DefaultTransactionStatus status, boolean unexpected) {
    try {
        boolean unexpectedRollback = unexpected;

        try {
            triggerBeforeCompletion(status);

            // 1. 【我是老大吗？】
            // 检查当前是不是"新事务"（即我是不是这个事务的开启者）
            if (status.hasSavepoint()) {
                // 如果有保存点，回滚到保存点
                status.rollbackToHeldSavepoint();
            }
            else if (status.isNewTransaction()) {
                // 【是的，我是老大！】
                // 只有在这里，才会执行真正的物理回滚！
                // 对应 JDBC 的 connection.rollback()
                doRollback(status);
            }
            else {
                // 【不是，我只是个小弟（参与者）！】
                // 对应 PROPAGATION_REQUIRED 加入了别人的事务
                if (status.hasTransaction()) {
                    // 2. 【打小报告逻辑】
                    // 如果配置了"参与者失败要全局回滚"（默认是 true）
                    if (status.isLocalRollbackOnly() || isGlobalRollbackOnParticipationFailure()) {
                        // 执行"标记回滚"
                        // 这只是把内存里的一个 boolean 变量设为 true
                        doSetRollbackOnly(status);
                    }
                }
            }
        }
        catch (RuntimeException | Error ex) {
            triggerAfterCompletion(status, TransactionSynchronization.STATUS_UNKNOWN);
            throw ex;
        }

        triggerAfterCompletion(status, TransactionSynchronization.STATUS_ROLLED_BACK);
        
        // ...
    }
}
```

那如果把catch放进supplier里呢？

```java
result = Helper.execute(() -> {
    try { 
        return commonService.methodB();
    catch (Exception e) {
        return response;
    }
});
```

遗憾的是还是一样的结果。再分析下过程：

1. Api (`ServiceA`) 调用 `Helper.execute()`，此时环境是 Tx1，对应拦截器是拦截器1（用的是 `NameMatchTransactionAttributeSource` ）。
2. `Helper` 上有 `@Service` ，拦截器2介入（用的是 `NameMatchTransactionAttributeSource` ）：
    1. 它默认使用 REQUIRED。
    2. 它看到 `ServiceA` 有Tx1。
    3. 所以它让 `Helper` 加入了 Tx1。
3. `Helper.execute` 上有 `@Transactional(propagation = Propagation.REQUIRES_NEW)` ，拦截器3介入（用的是 `AnnotationTransactionAttributeSource` ）：
    1. 它看到 REQUIRES_NEW。
    2. 它调用 `tm.suspend(Tx1)` ，挂起 Tx1。
    3. 它调用 `tm.begin()` ，开启 Tx2。
4. `CommonService` 也有 `@Service`，拦截器4介入（用的是 `NameMatchTransactionAttributeSource` ）
    1. 它默认使用 REQUIRED。
    2. 它看到上一层有个Tx2。
    3. 所以它让 `CommonService` 加入了Tx2。
5. `CommonService` 报错，抛出 `BusinessRuntimeException`。
    1. 拦截器4捕获到异常。
    2. 拦截器4发现自己是“参与者”（Joined Tx2）。
    3. 所以它执行 `setRollbackOnly()` 。
    4. Tx2 虽然还活着，但被打上了“必须回滚”标签。
6. lambda代码里catch住异常，返回结果。
7. 回到 `Helper.execute` 所在的拦截器3：
    1. 它看到 Lambda 执行结束了。
    2. 它看到**没有抛出异常**（被lambda吞了）。
    3. 它判断：“嗯，业务执行成功，没有异常。”
    4. 于是它决定执行 **提交（Commit）Tx2**。
8. 事务管理器：
    1. 收到 Commit 指令。
    2. 检查 Tx2 状态。
    3. 发现：`isRollbackOnly == true`（步骤 5 里被打的标签）。
    4. 判定：“你让我提交一个明明标记了回滚的事务？”
    5. 结果：抛出 `UnexpectedRollbackException`。

如果要验证也很简单，在外层再套一个try catch然后打印堆栈即可发现`Helper.execute()`会抛出个UnexceptedRollbackException。

---

解决办法其实很简单：

```java
result = Helper.execute(() -> {
    try { 
        return commonService.methodB();
    catch (Exception e) {
        TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
        return response;
    }
});
```

这个方法设的rollback-only并非和事务管理器自动设的rollback-only是同一个，前者在源码里称为`localRollbackOnly`，后者是`globalRollbackOnly`。而源码中会先判断如果`localRollbackOnly`为true的话就直接回滚，不会抛UnexceptedRollbackException。

这个代码在 `AbstractPlatformTransactionManager.commit()` 里：

```java
public final void commit(TransactionStatus status) throws TransactionException {  
   if (status.isCompleted()) { 
       throw new IllegalTransactionStateException("Transaction is already completed - do not call commit or rollback more than once per transaction");
   }

   DefaultTransactionStatus defStatus = (DefaultTransactionStatus) status;  
   // 校验是否需要回滚，这个是我们手动设或者正常抛出异常的
   if (defStatus.isLocalRollbackOnly()) {  
      if (defStatus.isDebug()) {  
         logger.debug("Transactional code has requested rollback");  
      }  
      processRollback(defStatus, false);  
      return;  
   }  
   // 判断事务管理器自动设的rollback only
   if (!shouldCommitOnGlobalRollbackOnly() && defStatus.isGlobalRollbackOnly()) {  
      if (defStatus.isDebug()) {  
         logger.debug("Global transaction is marked as rollback-only but transactional code requested commit");  
      }  
      processRollback(defStatus, true);  
      return;  
   }  
   // 2、提交事务
   processCommit(defStatus);  
}
```

当然另外一种解决办法就是使用编程式事务：

```java
private final TransactionTemplate transactionTemplate;  // 构造器注入，此处略

public <T> T Result<T> execute(Supplier<T> supplier) { 
    transactionTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    try {
        T data = transactionTemplate.execute(status -> supplier.get());
        return new Result<>(data, null);
    } catch (Exception e) {
		    return new Result<>(null, e);
}

// Result.java
public class Result<T> {
		private final T data;
		private final Exception exception;
		
		public boolean hasException() {
				return exception != null;
		}
}

// 调用
Result<String> result = Helper.execute(() -> commonService.methodB());
if (result.hasException()) {
		return response;
}
String data = result.getData();
```

但是要注意的是，不能把catch写在 `transactionTemplate.execute` 里面，否则内部的事务仍然会和前面一样把rollbackOnly设成true然后正常结束试图commit，结果导致UnexceptedRollbackException。

为什么这个catch写在 `transactionTemplate.execute` 外面了却没有之前那样抛UnexceptedRollbackException呢？主要还是因为它没有前面那么多层拦截器切面干涉：

1. Api (`ServiceA`) 调用 `Helper.execute()`，此时环境是 Tx1，对应拦截器是拦截器1（用的是 `NameMatchTransactionAttributeSource` ）。
2. `Helper.execute` 上有 `@Service` ，拦截器2介入（用的是 `NameMatchTransactionAttributeSource` ），同时加入 Tx1。（此时它在监控 Tx1）
3. 进入目标方法。
4. 执行 `transactionTemplate.execute` ：
    1. 代码内部 挂起 Tx1，开启 Tx2。
    2. 异常抛出。
    3. `transactionTemplate` 内部 回滚 Tx2。
    4. `transactionTemplate` 内部 恢复 Tx1。
    5. `transactionTemplate` 重新抛出异常。
5.  try-catch ：
    1. 在异常碰到拦截器 2 之前，就把它吞了！
    2. 转换成了一个正常的返回值对象。
6. 方法返回。
7. 拦截器 2：
    1. 看到方法正常返回了对象，没有抛出异常。
    2. 它就不会去执行 `setRollbackOnly`。
    3. Tx1 安全存活。

也就是说编程式事务能够正常将Tx1挂起（suspend）再恢复（resume），这使得在Tx1醒过来之前我们就已经把异常处理掉了，Tx1醒来过后就看不到异常了。
