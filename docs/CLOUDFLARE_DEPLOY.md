> Superseded: deployment now uses Cloudflare Pages with same-origin HLS media. See [Pages deployment](PAGES_DEPLOY.md). Do not run the R2 commands below.

# LucidScore Cloudflare 部署

## 构建

- `npm run build`：生产包，媒体默认指向`https://media.lucidscore.org`；dist不包含audio/videos，且不包含工作记录、Cookie或原始Recording。
- `npm run build:local`：包含媒体的本地完整构建；便携包也使用这个模式。
- `VITE_MEDIA_BASE_URL`可覆盖公共媒体地址。它是公开配置，不能放入任何凭据。
- 生产审阅抽屉默认隐藏校核面板，可用 `?review=1` 打开。播放缓冲和错误提示不受此开关影响。
- 序幕观看键为`lucidscore_prologue_seen`，旧域名记录不会影响新域名首次访问。菜单、Lobby与舞台页脚均保留重看入口；页脚提供源码仓库链接。

## 远端命令

```powershell
npx wrangler login
npx wrangler whoami
npx wrangler r2 bucket create lucidscore-media
npx wrangler r2 bucket cors set lucidscore-media --file r2-cors.json
npx wrangler r2 bucket domain add lucidscore-media --domain media.lucidscore.org --zone-id 7491795c386662176d8aced95589e77f --min-tls 1.2
npm run sync:media
npm run build
node scripts/check-cloud-build.mjs
npx wrangler deploy
```

桶若已存在则不要重复创建。`sync:media`使用官方Wrangler远端上传，读取经过准备的录音清单与HLS分片清单，不遍历Cookie或原始素材。上传成功记录留在忽略的`.local/deploy/`，以后按SHA跳过已登记对象；默认两路并发，可通过`MEDIA_UPLOAD_CONCURRENCY`调整。CORS允许匿名GET/HEAD与Range，并暴露缓冲所需响应头。

站点使用Workers Static Assets，`wrangler.jsonc`配置SPA刷新回退、workers.dev预览与lucidscore.org自定义域。官方依据：[静态资产](https://developers.cloudflare.com/workers/static-assets/)、[SPA路由](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)。

## 2026-11-16 当前检查结果

Wrangler4.162.0安装及OAuth登录已完成。生产构建、类型检查、84单测、静态包检查、Wrangler deploy dry-run通过。生产包214个文件、约115.8MiB、单文件均小于25MiB；准备了1425个媒体对象。

**尚未上线：** R2列表／创建API返回10042，要求先在Dashboard启用R2；CLI不能替用户确认账户账单。域lucidscore.org当前Pending，Cloudflare指定Nameserver为giancarlo.ns.cloudflare.com与grace.ns.cloudflare.com。待启用R2、域验证后再绑定媒体域、上传、正式deploy并测试线上Range/CORS/视频与深层路由。不把dry-run当作已部署，不提供虚构预览地址。

本机Windows虚拟内存曾接近耗尽，导致Node/Vite/Wrangler退出；后来使用单进程测试、`ESBUILD_WORKER_THREADS=0`及较小V8半空间完成检查，不修改操作系统设置。
