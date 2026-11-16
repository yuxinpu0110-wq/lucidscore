# 全屏视频序幕

首次访问优先尝试有声自动播放。若浏览器拒绝，则暂停在00:00，不降级静音播放，显示“进入现场 · 开启原声”幕布及耳机提示。点击按钮或画面空白处，在同一个同步点击回调中设置currentTime=0、muted=false、volume=1并调用play，不额外施加300ms音量包络；视频原有母带淡入仍保留。第一幕14.5秒开始第二幕的1.2秒叠化；也可点击“下一幕”。第二幕15.5秒提供模式入口，21.5秒暂停并柔和暗化。

字幕由网页按媒体currentTime渲染，不烧录进视频。手机画面使用cover与58%／35%构图；桌面居中。页面使用原生modal dialog限制焦点，Escape与“跳过序幕”进入门厅。选择启发探索会从第一章开始播放，自由检索进入第一章舞台并保持暂停。重看入口位于“审阅与音源”菜单，重看前暂停主音频。离开序幕会暂停两个video并清理动画。

已观看标记为localStorage的`mahler-prologue-seen-v1`；重看不必清除此标记。开发测试若只验证主站，应在初始化页面时预先将它设为`1`。存储不可用时仍可进入网站，刷新后可能再次显示序幕。

## 母带

实际素材为`Recording/Video Clip/intro-abyss.mp4`（16.138秒）和`intro-resurrection.mp4.mp4`（21.989秒）。`npm run videos:prepare`保留原片，输出到`public/videos`，使用H.264/yuv420p、AAC192k、CRF21、最大视频码率5Mbps及Faststart。时长裁至16.13／21.97秒；淡出时长取1.53／2.47秒，使14.6／19.5秒开始的音频衰减恰好结束于片尾。第一幕视频黑场淡出14.93–16.13秒，其他淡入按需求。

输出约6.3MB与11.3MB；`mastering.json`保存滤镜参数、来源名与SHA。Vite从public复制到dist；本地发行服务器已支持MP4 MIME。未发现R2配置，因此本轮未上传云存储。

`npm run test:prologue`在390px及1440px实际Edge验证静音起播、字幕时间、开声、叠化、冻结、启发入口、重看、跳过与已观看持久化，并检查MP4索引前置。本机截图在`tmp/prologue/`。Safari/iOS可能限制脚本volume包络，视频本身仍有母带淡入淡出；尚未真机验收。字幕中“八十五分钟”沿用用户提供的剧本，并非当前约90分钟LSO录像的精确时长声明。

## 2026-11-16 序幕有声探测与入场幕布（取代静音起播）

IntroPrologue移除首片muted/autoplay属性及300ms开声包络，挂载显式currentTime0/mutedfalse/volume1/play。获准直接开演；失败暂停重置00:00，NotAllowedError进入blocked入场幕布，不降级静音，字幕/自动下一幕均以started ref门控。按钮与空白区同步点击调用上述四步，不await其他动作；started仅play成功后置true。attempt token防止旧promise覆盖后续手势或卸载。呼吸光晕、耳机副标、静音浏览跳过、减少动态停呼吸；保留母带淡入及后续叠化。
TS、构建、84单测、test:prologue通过：允许有声直出（测试环境放行）、注入NotAllowedError验证900ms仍time0/pausedtrue/mutedfalse/无字幕，点击play记录time0/volume1/mutedfalse/userActivationtrue，幕布关闭且媒体推进；字幕/转场/双入口/重看/持久化通过。curtain-mobile.png已视觉检查。dist更新，未真机验收或云端发布。

## 2026-11-16 Lobby右下角返回序幕

用户反馈看过后缺少直达入口。Lobby且未显示序幕时增加fixed右下角“返回序幕”，12px低对比文字、safe-area留白、hover/focus可见；点击暂停主audio、重新挂载IntroPrologue从头体验，不受已观看localStorage限制，原菜单重看入口保留。tsc与build通过，新增test:prologue在390/1440已观看状态下验证按钮右下位置、重复两次返回/跳过、主audio暂停与视频从头。

## 2026-11-16 终幕典藏落款与低调推进提示

用户要求删除9.8秒“八十五分钟”引导语，现由PROLOGUE_CREDITS配置三行：古斯塔夫 · 马勒；c小调第二交响曲「复活」；Gustav Mahler · Symphonie Nr. 2 c-Moll (1888–1894)。网页渲染分层字体/淡暖白/暗银斜体，9.8秒淡显；15.5秒保留同一落款节点，top以1.1秒过渡向上4vh，下方渐显双入口。原下方下一幕胶囊改为透明无框低对比“点击任意位置跳过”，点击仍只推进到下一幕；右上跳过全部序幕行为不变。
类型/构建/test:prologue通过，新增10秒落款出现、16秒上移>10px验证，390/1440及入场拦截/开声/双模式/重看回归通过。tmp/prologue/choices-390.png已视觉检查三行及双入口；dist更新。未重新编码视频、未发布或改动主站布局。
