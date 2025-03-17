---
categories:
  - - 编程
    - Go
  - - 编程
    - CICD
title: go通过github action自动部署到服务器
abbrlink: daf4284d
---

我的最终的配置文件 `deploy.yml` ，主要做了以下几件事：

1. 先配置go环境；
2. go build；
3. 先终止在伪终端里跑的程序（否则无法成功上传）；
4. 上传构建后的文件；
5. 让程序在伪终端里跑起来。

```yaml
# This workflow will build a golang project
# For more information see: https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-go

name: Go

on:
  push:
    branches: [ "master" ]


jobs:

  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Set up Go
      uses: actions/setup-go@v4
      with:
        go-version: "1.20.3"

    - name: Download dependencies
      run: go mod download

    - name: Build
      run: go build -o build/rabbitool

    - name: ssh-scp-ssh-pipelines
      uses: cross-the-world/ssh-scp-ssh-pipelines@v1.1.4
      with:
        host: ${{ secrets.SERVER_IP }}
        port: 22
        user: ubuntu
        key: ${{ secrets.ID_RSA_GITHUB_ACTION }}
        first_ssh: |
          export PID=$(ps -ef | grep ./rabbitool | grep -v grep | awk '{print $2}')
          if [[ $PID != "" ]]; then kill -SIGINT $PID; fi
        scp: |
          "./build/rabbitool" => "/home/ubuntu/app/rabbitool/"

    - name: SSH Command
      uses: D3rHase/ssh-command-action@v0.2.2
      with:
        host: ${{ secrets.SERVER_IP }}
        port: 22
        user: ubuntu
        private_key: ${{ secrets.ID_RSA_GITHUB_ACTION }}
        command: |
          -tt
          export TERM=xterm && 
          export SESSION_NAME=$(tmux ls | grep rabbitool) && 
          if [[ $SESSION_NAME = "" ]]; then tmux new -s rabbitool; else tmux a -t rabbitool; fi && 
          tmux send-keys -t rabbitool "cd /home/ubuntu/app/rabbitool/ && ./rabbitool" C-m
```

---

期间经历了很多坎坷，接二连三遇到问题：

先出现了 `remote open("/home/ubuntu/app/rabbitool/rabbitool") failure` ，解决办法是先把正在运行的程序停了，然后再上传。因此才用ssh-scp-ssh-pipelines。

然后出现了 `open terminal failed: not a terminal`，解决办法是ssh启动时加上 `-t` 。但是ssh-scp-ssh-pipelines没法在连接ssh时传入参数，因此最后再用个单独的ssh action。

> [shell - tmux open terminal failed: not a terminal - Stack Overflow](https://stackoverflow.com/questions/25207909/tmux-open-terminal-failed-not-a-terminal)

又出现了 `Pseudo-terminal will not be allocated because stdin is not a terminal.`，解决办法是改成 `-tt` 。

> [倘若微小 - 使用 SSH 进行远程操作](https://www.ifmicro.com/%E8%AE%B0%E5%BD%95/2015/09/23/ssh-remote-run-cmd/)

又出现了 `open terminal failed: terminal does not support clear`，解决办法是加上 `export TERM=xterm` 。

> [191869 – tmux(1) or screen(1) refuse to start via script invoked via service(8)](https://bugs.freebsd.org/bugzilla/show_bug.cgi?id=191869)

就在以为终于解决了时，又发现虽然成功进了tmux的session，但是后续没法继续执行命令，workflow就一直卡在那里。

搜了搜发现可以不attach session也能让伪终端里执行指令，就是用 `tmux send-keys` 。其中 `C-m` 不可缺，表示发送一个回车键，否则就只传入指令不执行。