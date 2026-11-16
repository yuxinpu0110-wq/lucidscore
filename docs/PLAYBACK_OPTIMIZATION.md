# 谱面与公网播放优化

2026-11-12。当前为v2.0本地开发版本；v1.0归档保留，GitHub发行附件与公网隧道未更新。

## v2.0 音频引擎重构

进度时间不再保存在App的高频React state中。`PlaybackClock`仅在小节／谱段／唱词／提示边界及显式操作时通知顶层；`PlaybackProgress`以Ref更新进度条、可访问时间说明与数字，30fps上限，拖动中只预览、松手后提交一次seek。出发上下文及±5秒按钮读取真实媒体时间，避免使用低频快照造成回退偏移。

小节、谱段及唱词查询共用二分查找，优先检查上次命中及下一段；ID查询缓存为Map。音频光场与FFT上限30fps，三个频段变量变化小于0.005时跳过样式写入，精确归零与破晓进度另行处理。后台页停止装饰RAF，媒体由浏览器继续播放。

`MahlerAudioEngine`绑定持久的单一audio元素，加载时使用metadata预读；长音轨不经过decodeAudioData整曲解码。选择[HLS.js](https://github.com/video-dev/hls.js/blob/master/docs/API.md)作为分片内核，按官方接口挂载同一媒体元素，`maxBufferLength`、`maxMaxBufferLength`和`backBufferLength`均为60秒；HLS库按需加载。Safari保留原生HLS，Edge即使声明原生支持也优先走MSE，以使缓冲配置生效。HLS致命错误回退同源M4A并恢复位置／播放意图，源切换和卸载清理旧实例与待办回调。

原有唯一AudioContext在用户播放手势中创建，MediaElementSource只连接一次；其间新增单位增益GainNode。播放中seek先以40ms降低增益，随后更新currentTime，在seeked／canplay后以60ms恢复；连续请求只执行最后一个尚待处理的目标。没有产生第二个audio或第二个AudioContext。用户音量不被覆盖；不支持Web Audio时仍保留原生播放，但无法提供这条增益包络。

### 文件处理与使用

```sh
# 检查并按需无损前置M4A/MP4索引
npm run audio:faststart
# 只检查，发现非Faststart文件即失败
npm run audio:faststart -- --check
# 可选：从现有AAC生成约4秒的fMP4 HLS分片
npm run audio:hls
npm run build
npm run preview
```

五个现有M4A均实测moov在mdat之前，无需再次重封装。脚本只读取MP4顶层头部；需要处理时使用`-c copy -movflags +faststart`，临时文件验证后替换，并刷新已登记派生文件哈希。原始ADTS `.aac` 没有moov索引，脚本明确跳过；要随机定位需改封装为M4A或HLS。

HLS切片使用`-c:a copy`，不再次压缩现有AAC；每章有独立init.mp4、播放列表及分片，构建逐文件验证SHA并复制到dist。Windows下FFmpeg以该乐章输出目录为cwd，确保初始化文件写入正确目录。原FLAC与原小节映射身份不变。

本机地址默认M4A Range；具有已生成HLS资源的公网地址默认HLS。地址追加`?audio=hls`可在本机检查HLS，`?audio=progressive`可强制M4A；缺少HLS资源时使用M4A。托管服务器需提供`.m3u8: application/vnd.apple.mpegurl`、`.m4s/.mp4/.m4a: audio/mp4`以及M4A字节范围请求。本地启动器已支持这些MIME。HLS资源约额外占178MB，未生成时不会增加成品体积。

### 验证范围

`npm run test:audio-engine`在实际Edge中分别测试M4A与MSE HLS：同一小节内800ms窗口App渲染次数为0，进度条继续更新；频段写入频率和0.005阈值通过；40/60ms增益请求、跨章同一audio／Context／Source、第712小节35:47定位通过。HLS检查明确要求媒体src为MSE blob，预缓冲超过45秒、总缓冲小于130秒，回听命中的分片不重复请求，避免把自动回退M4A误判为HLS成功。可用`?profilePlayback=1`启用`mahler.app.render`性能标记；默认关闭。

Faststart测试音频重封装前后解码PCM哈希相同。HLS在第一章30秒、第五章30秒及35:47取样，与M4A解码波形相关系数均大于0.9999；独立解码／寻址窗口差约13–23ms，不宣称采样级零偏移。此检查不提高音乐审校状态。

48KiB/s真实限速下12秒连续播放无再次缓冲；停止传输后的缓冲耗尽／恢复不误开探索。回执与截图在本地`tmp/performance/audio-engine`。这些是本机Edge测试，未宣称Safari／Mac实测；持续带宽不足或设备音频故障仍可能导致缓冲，HLS不提供网络条件无关的“零卡顿”保证。

## 定位框

第二／第三系统的滑动修正：相机投影与定位框平移分别置于两层变换。SVG视口与高度的微调只更新外层矩阵，不再取消内层Web Animations。覆盖第一章10→11换行、12→13、13→14、14→15及16→17的实际中间位置和最终对齐检查。

保留透明谱面、主题色与静态玻璃边缘。改用300ms的Web Animations平移／缩放，取消弹簧、独立边缘拉伸、换行压缩、逐帧宽高修改、速度扫光及SVG湍流折射。根据用户后续反馈，移动和静止时保持相同的光学提亮滤镜，取消动画起止时切换滤镜造成的突然变暗／变亮；减少动态偏好直接落定。相机过渡直接更新SVG，不再每帧触发React渲染；保留翻页解码等待、旧图与700ms淡入。

同一Edge环境、1440×1000、10次交替切换第一章1／2小节，CDP Performance对比：

| 指标 | 原版 | 优化后 |
| --- | ---: | ---: |
| 定位框宽高变化次数 | 254 | 10 |
| LayoutCount | 284 | 40 |
| RecalcStyleCount | 268 | 155 |
| ScriptDuration | 96.5ms | 41.9ms |
| LayoutDuration | 49.9ms | 15.5ms |

这是本机单次同场景测量，不代表所有设备的帧率；原始回执在本地tmp/performance。

## v1.0基线的播放方案与取舍（历史记录）

查阅了 [Howler官方文档](https://github.com/goldfire/howler.js#html5-boolean-false)、[Shaka缓冲配置](https://shaka-project.github.io/shaka-player/docs/api/tutorial-network-and-buffering-config.html)和[MDN缓冲区说明](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Audio_and_video_delivery/buffering_seeking_time_ranges)。Howler建议大文件使用HTML5 Audio逐步加载；Shaka给分段流媒体提供缓冲目标与重缓冲配置。本项目已有单一原生媒体元素及返回／循环控制，这一轮继续使用原生Audio流式读取与Range请求。

五个FLAC合计约364 MB。新增直接从其生成的AAC-LC 256kbps M4A共约178 MB，`+faststart`把索引放在文件前方；原无损文件保留作解码回退。不添加归一化、增益调整、分轨停顿或第二个播放器。网页派生版属于有损编码。

`prepare-web-audio.mjs`记录来源SHA-256、派生SHA-256、时长与体积，复用缓存前校验派生哈希；`src/webAudio.ts`拒绝来源、乐章或时长不符的记录。只对白名单内置派生版本沿用原时间轴，未知本地文件不获得此例外。容器报告时长比FLAC多约23ms；五章各两段解码波形交叉相关核查，在8kHz抽样分辨率下均未检测到时间位移，相关系数大于.9997。此为抽样技术校验，不提高原谱音对齐的音乐审阅精度。

预加载改为auto（浏览器仍可自行决定预读量）。新增真实buffered范围显示和延迟400ms的缓冲提示；waiting不会当作用户暂停，不展开探索。暂时断流由原生缓冲恢复；网络错误后可点击播放重新加载并恢复位置；AAC解码不支持或失败时一次回退FLAC。音频光场更新上限约30Hz，隐藏页面停止装饰计算，播放时钟取自原生媒体。

`npm run test:playback-performance`使用真实48KiB/s响应和临时停止发送字节，检验连续播放、实际缓冲耗尽与恢复、不误开探索、单一音源、472小节定位及唱词。原生渐进播放并非自适应码率流媒体，网络长期低于编码所需带宽时仍会缓冲；本轮未引入HLS/DASH和CDN。
