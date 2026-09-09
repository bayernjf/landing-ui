# AGENTS.md — landing-ui（@bay/landing-ui）

供 AI coding agents（Claude Code / Codex / Cursor / Copilot 等）在本仓库工作时自动读取。

## 项目概览
`*-landing` 站点共用的设计系统：CSS 设计令牌 + 零框架依赖的 Astro 组件。
存在的意义是替代散落在 14 个落地页仓库里的 `Icon.astro` / `global.css` 副本，保持单一事实源。
当前版本 `1.5.0`，Apache-2.0。

## 导出内容
| Export | 说明 |
|---|---|
| `@bay/landing-ui/styles/tokens.css` | `--lui-*` 设计令牌（字体、圆角、阴影、动效、强调色）+ 基础类（`.lui-btn`、`.lui-card`、`.lui-eyebrow`） |
| `@bay/landing-ui/components/Icon.astro` | 内联 Lucide SVG 图标组件（约 45 个图标），零依赖 |
| `@bay/landing-ui/components/BayjfMark.astro` | BayJF 品牌标记（"Shoreline Hook"），内联 SVG |
| `@bay/landing-ui/components/BayjfLink.astro` | `BayjfMark` + "BayJF" 文字，链回 bayjf.com（每个站点的返链） |
| `@bay/landing-ui/components/StarOnGithub.astro` | GitHub 标记 + "Star on GitHub" 胶囊按钮 |
| `@bay/landing-ui/lib/releases` | 解析最新 GitHub release 的资产，让下载按钮直链文件而非 releases 页面 |

`package.json` 的 `exports` 是唯一对外契约，新增文件必须同步登记，否则下游引用不到。

## 使用方式
下游落地页在 `package.json` 里按 git tag 引用：
```json
"dependencies": { "@bay/landing-ui": "github:bayernjf/landing-ui#v1.5.0" }
```
Cloudflare Pages 与 GitHub Actions 都能从公开 GitHub 仓库安装，无需额外凭据。

## 约定
- **版本以 git tag 管理**：发布新版本要打 tag（如 `v1.6.0`），下游改 tag 后重新 `npm install` 才生效。
- 组件必须是零运行时依赖的内联 SVG / 纯 CSS，避免给下游静态站增加 JS。
- 改动是**破坏性**的（14 个站点共用）：改令牌名或组件 props 前先评估下游影响，必要时保持向后兼容。

## 不要做的事
- 不要引入需要运行时 JS 的依赖。
- 不要只改代码不打 tag（下游靠 tag 锁定版本）。
- 不要提交任何密钥。
- 不要跳过 `git pull --rebase` 直接 push。
