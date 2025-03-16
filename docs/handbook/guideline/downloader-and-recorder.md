爱丽丝组所指的“源”，是指未经过剪辑或加工（特殊情况除外）的完整的直播录像或者完整的视频，供烤肉使用。

## 上传的位置

一般情况上传到OneDrive组文件夹的“直播录像”文件夹内。“直播录像”是临时文件夹，会定期清理。

如果是全熟项目，可以在烤肉的时候将源临时移到对应项目文件夹内；投稿后，放回“直播录像”文件夹内。

> [!TIP]
> 关于文件名规范，请参阅 [源视频文件名规范](/handbook/project-management/file-naming-convention.md#源视频)。

## 扒源

一般情况下都是剪辑或者立项人自行扒源，但也可寻求组内帮助。

### 油管源

理论上使用可播放的最高质量的画质（一般是1080p60帧），且是mp4格式。若有特殊要求（如全熟轴翻需要低清源方便下载）则按具体需求为准。

以扒源工具yt-dlp为例，这里用源地址[https://www.youtube.com/watch?v=q7ibJKRo0Zc](https://www.youtube.com/watch?v=q7ibJKRo0Zc)作为示例，符合文件名命名规范的源可用如下命令获取：

`yt-dlp.exe -o "[油管][%(upload_date>%y.%m.%d)s]%(title)s.%(ext)s" -f "bv[ext=mp4]+ba[ext=m4a]" https://www.youtube.com/watch?v=q7ibJKRo0Zc`

源封面用如下地址获取：

`https://i.ytimg.com/vi/[video ID]/maxresdefault.jpg`

这里需要替换[video ID]为视频ID，既源视频网址最后v=[...] 的[...]部分

### B站源

需要皮套man上号下载。

## 录像

录像往往是激光时需要。

