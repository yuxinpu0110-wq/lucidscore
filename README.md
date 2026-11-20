# LucidScore

**让总谱变清澈。** LucidScore 是开源的交互式古典音乐导听平台，将录音、同步总谱与分层导听连接起来，让听众在聆听与阅读之间自由探索。首部收录作品为马勒《c小调第二交响曲「复活」》。

[在线体验](https://lucidscore.org/mahler/symphonie-2) · [GitHub](https://github.com/yuxinpu0110-wq/lucidscore) · [使用指南](release/使用指南.md)

## 聆听与探索

- 首次访问显示电影序幕；浏览器限制自动播放时，点击开启原声。两幕使用同一连续视频自然转场。门厅与页脚可重看序幕。
- 门厅默认第一乐章，选择乐章或开始聆听进入舞台。自由检索与启发探索共享播放位置；赏析、结构、和声、配器提供不同阅读视角。
- 精华导听串起六个片段。点击或拖动等宽进度条可跨幕定位，也可以在当前位置转入全乐章的自由检索。
- V3 导读包含跨乐章小节引用，跳转后可从悬浮返回条回到原处。
- 总谱跟随小节定位，可回听小节或正文引用；手机端支持放大谱面及触控平移，底部播放器固定。
- 点击「复制此乐段链接」分享当前乐章、导读段落、视角及模式。打开链接会恢复该段落并保持暂停；首次访问仍显示序幕。

导读包含作者阐释，逐小节音频定位及谱面框选仍有待校核。估算定位不等于逐音跟随，也不等于分析结论已获音乐学审阅。详情见[资料来源](docs/SOURCES.md)及总谱说明。

## 下载使用

[GitHub Releases](https://github.com/yuxinpu0110-wq/lucidscore/releases) 提供既有便携发行包。Windows 选择 x64 压缩包，完整解压后运行 `START.cmd`；Mac 选择对应 Apple 芯片或 Intel 架构，运行 `START.command`。v1.1 提供网页和源码，便携包仍可从历史发行下载。

便携包包含运行环境、音频与谱面；源码 ZIP 需要按下方步骤安装。macOS 包尚未完成真机验收，详见 [macOS 使用指南](release/macOS使用指南.md)。

## 本地开发

需要 Node.js 24、npm 与 PATH 中可用的 FFmpeg：

```sh
npm ci
npm run dev
```

若实时开发服务首次打开很慢，可用本地构建预览（包含精华导听）：

```sh
npm run dev:fast
```

它先构建，再在 `http://127.0.0.1:5173/` 提供静态页面，不需要浏览器临时编译大量模块；代码修改后需要重新运行。已有预览运行时直接刷新即可，重新启动前应先关闭占用该端口的服务。`build:local` 使用 Vite 的 `portable` 模式（`local` 是 Vite 禁用的模式名）。本地构建包含完整媒体，不能直接部署到 Pages；正式发布仍需运行普通 `npm run build`。

启动脚本从 `Recording/` 准备五个连续乐章的无损与 AAC 播放缓存。首次需要转码，后续按指纹复用。

## 构建与部署

```sh
npm run audio:hls
npm run build
node scripts/check-cloud-build.mjs
npm run preview
```

生产构建面向 Cloudflare Pages：媒体使用本站相对路径，优先 HLS；包含全部 HLS 分片及小于 24MB 的 M4A 回退，不包含超大整章 M4A 或 FLAC。所有字体自托管，无 Google Fonts 依赖。录音缓存保存在忽略的 `.local/`，构建复制所需资源到 `dist/`。本地完整包使用 `npm run build:local`。

```sh
npx wrangler pages deploy ./dist --project-name=lucidscore --branch=main
```

SPA 路由为 `/mahler/symphonie-2`；根路径和旧拼写自动替换跳转，刷新由 `_redirects` 处理。`?catalog=1` 保留目录入口，`?review=1` 显示开发审阅工具。参数示例：`?m=1&sec=3&tab=harmony&mode=free`；段落从 1 开始编号。详见 [部署说明](docs/PAGES_DEPLOY.md)。

序幕母带由 `npm run videos:prepare` 生成；保留黑场淡入、音频淡化与两幕交叉转场。完整序幕小于 6MB。

## 内容编辑与验证

作者正文路径由 [导读说明](content/listen_guide/README.md) 指定；Markdown 栏目和小节链接规范见 [编辑说明](docs/CONTENT_MARKDOWN.md)。启发文本集中在 [INSPIRATION_PROMPTS.md](content/INSPIRATION_PROMPTS.md)，修改后执行 `npm run prompts:check` 与 `npm run prompts:apply`，不要重新导出覆盖编辑稿。

```sh
npm test -- --maxWorkers=1 --no-file-parallelism
npm run content:check
npm run prompts:check
node scripts/check-prologue.mjs
node scripts/check-fonts-routes.mjs
```

源码与成品不包含本地工作记录、凭据或用户导入的文件。项目所有者已指定内置录音随项目分发；作品公版状态不替代具体录音与谱本的使用条件，来源与限制见 [SOURCES.md](docs/SOURCES.md)。字体 OFL 许可证随成品提供。
