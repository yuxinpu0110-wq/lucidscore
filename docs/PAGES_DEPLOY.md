# LucidScore · Cloudflare Pages

正式站点：https://lucidscore.org

2026-11-16 最新部署版本：https://ab842d04.lucidscore.pages.dev


作品规范地址：https://lucidscore.org/mahler/symphonie-2

根路径和历史路径 `/mahler/symphony-2` 使用客户端 replace 跳转到规范地址，保留查询参数与锚点；`/?catalog=1` 保留为目录入口。SPA 刷新仍由 `_redirects` 处理。

字体已使用 Fontsource 自托管：Noto Serif SC 400/600/700，Cormorant Garamond 400/500/600 常规与斜体，按 unicode-range 加载需要的字符分片。没有 Google Fonts 外链；OFL 许可证随站点提供在 `/fonts/`。该版产物含 300 个 WOFF2 文件，单个文件仍小于 24MB。移动端底部增加 120px 加安全区的遮罩，从播放器中心到屏幕底边为实底，桌面端不显示该遮罩。

`node scripts/check-fonts-routes.mjs https://lucidscore.org` 已通过正式域名浏览器检查：实际加载各字重及斜体、字体同源且无 Google Fonts 请求、跳转保留参数/锚点且不增加历史、首次序幕、手机尺寸下遮罩与播放按钮点击区域、桌面无底部遮罩。浏览器为 Edge 移动尺寸模拟；尚未在 iPhone Safari 真机复测。

本方案替代此前R2方案，没有创建或使用R2桶。所有媒体以站内路径提供，生产环境固定优先HLS；不打包超过24MB的完整M4A或FLAC。HLS直接复用原AAC分片，不再次有损压缩音乐。小于24MB的M4A保留作为支持范围内的回退。

两段序幕由原片重新标准化到720p/30fps、H.264/yuv420p、AAC192k和Faststart，保留母带淡入淡出；成品分别2,639,867和4,379,764字节，均小于6MB。

## 更新发布

```powershell
npm ci
npm run build
node scripts/check-cloud-build.mjs
npx wrangler pages deploy ./dist --project-name=lucidscore --branch=main --commit-dirty=true
```

项目已创建且已授权，无需重新开通R2或绑定信用卡。当前Wrangler4.162.0创建项目时会默认代理至Workers，因此仅首次创建使用了`pages project create ... --force`来明确创建传统Pages项目；后续部署不需要这个标志。配置为`pages_build_output_dir`，SPA由`public/_redirects`提供。`npm run build:local`仍可构建含无损音频的本地完整包，不能用该模式上传Pages。

生产包2,236个文件、约368.4MiB，逐文件检查均小于24MB。官方CLI成功上传2,235个静态文件，另处理_redirects。Windows上传时384MB的Node堆不足，使用2GB堆完成；这不改变云端运行费用。

## 验证

84项单测通过。`node scripts/check-pages-live.mjs`实际Edge验证序幕开声、五章HLS真实推进、默认隐藏开发统计、深层路由`/mahler/symphony-2`及无JS错误。视频Range请求在该次浏览器缓存情况下返回完整文件200，HLS分片返回206/100字节，不将二者混为一谈。命令行HTTP客户端被Cloudflare1010拦截，普通浏览器可访问。回执在忽略的`.local/deploy/pages-live.json`。

## Custom domain (verified 2026-11-16)

Production: https://lucidscore.org

Pages fallback: https://lucidscore.pages.dev

After the CNAME update, Pages reports domain, verification and certificate validation all Active. Actual Edge checks passed on the production domain: prologue audio, all five HLS movements, hidden development statistics, deep-link refresh and no JavaScript errors. Video and audio fragment Range requests both returned 206 with 100 bytes.

```powershell
node scripts/check-pages-live.mjs https://lucidscore.org
```

Cloudflare Pages hosts the site independently of this computer. Shutting down or restarting this computer does not interrupt the published website. Rebuild and deploy to publish future changes.

## Continuous prologue update (2026-11-16)

Opening poster removed at user request; the original black fade-in is restored, with mobile opening crop still 84% 35%. Scene two uses 58% 35% on mobile; desktop stays 50% 40%.

The prologue now plays through one video element and one continuous H.264/AAC faststart file, /videos/intro-prologue.mp4 (36.489s, 5,783,734 bytes). FFmpeg bakes in the existing 1.2s crossfade at14.5s; chapter-relative captions, credits at9.8s, choices at15.5s and freeze at21.5s in chapter two are preserved. No second play() or new media element is needed at automatic transition. Manual advance seeks the same element. This avoids the per-element autoplay grant issue on mobile WebKit; first unmuted start still respects the browser policy.

Recreate the clips and continuous master with npm run videos:prepare. Check with node scripts/check-prologue.mjs (local preview), or pass https://lucidscore.org for the production URL. The strict-policy test denies video play() outside a user activation, then verifies natural progress into scene two with just the initial click and no further play calls. Device checks use Edge; real iPhone Safari verification remains pending.
