# 部署为公开网页

人名条工坊是纯前端应用：模板渲染、预览、MOV/PNG 导出都在浏览器里完成，项目存在浏览器 localStorage，自定义字体存在 IndexedDB。**不需要登录，也不需要数据库**，可以作为静态网站部署到任何静态托管。

## 构建

```bash
npm ci
npm run build:static
```

- 构建命令：`npm run build:static`
- 输出目录：`.output/public`（含 `index.html`、`assets/`、`fonts/`、`bg/`）
- Node 版本：22

本地验证：

```bash
npm run serve:static   # http://127.0.0.1:4173/
```

## 各平台设置

| 平台 | Build command | Output / Publish directory |
| --- | --- | --- |
| Cloudflare Pages | `npm run build:static` | `.output/public` |
| Netlify | 已带 `netlify.toml`，直接连仓库即可 | `.output/public` |
| Vercel | Framework 选 *Other*，Build `npm run build:static` | `.output/public` |
| 阿里云 OSS / 腾讯云 COS / GitHub Pages | 本地构建后上传 `.output/public` 全部文件 | — |

注意：

- 资源使用根路径（`/assets/...`），请部署在域名根目录，而不是子路径。
- 中文网页字体（思源宋体 / 思源黑体）来自 Google Fonts；在无法访问 Google 的网络里会自动回退到系统字体（苹方、微软雅黑、宋体），渲染与导出仍可用。英文副行、号码与界面字体已随站点自托管（`public/fonts`）。
- 原有 `npm run build`（Vercel + Nitro 服务端 + 数据库迁移）保持不变，只在需要服务端功能时使用。
