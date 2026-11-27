# 代码评审报告 — landing-ui（2026-11-02）

评审范围：`/Users/jiangfeng/000mycodes/landing-ui` 全部源码（AGENTS.md、CLAUDE.md、README.md、package.json、git-commit-message.md、components/、lib/、styles/，共 741 行）+ 下游 27 个 `*-landing` 仓库的消费方式抽样验证。本次评审为只读，未修改任何源码、未执行任何 git 写操作。

## 一、仓库定位与规模概览

- **定位**：`@bay/landing-ui` v1.5.0（Apache-2.0），`*-landing` 落地页共享设计系统：CSS 设计令牌 + 零运行时依赖的 Astro 组件 + 一个纯 JS 客户端工具库。
- **规模**：11 个文件、741 行（不含 .git）：
  - `styles/tokens.css`（131 行）：`--lui-*` 令牌 + `.lui-btn/.lui-card/.lui-eyebrow` 三个基础类
  - `components/Icon.astro`（82 行）：53 个内联 Lucide SVG 图标（实测 `grep -c '^  [A-Za-z0-9]*:'` = 53，文档声称"约 45 个"，已过时）
  - `components/BayjfMark.astro`（47 行）/ `BayjfLink.astro`（28 行）/ `StarOnGithub.astro`（81 行）
  - `lib/releases.js`（71 行）+ `lib/releases.d.ts`（25 行）：GitHub Releases 资产解析（纯 JS + 类型声明）
- **分发机制**：通过 `package.json` 的 git tag 引用（`github:bayernjf/landing-ui#vX.Y.Z`），远端仓库为 PUBLIC（`gh repo view bayernjf/landing-ui --json visibility` → `"PUBLIC"`），无需凭据即可安装。本地 tag（v1.0.0–v1.5.0）与远端完全一致；`npm pack --dry-run` 通过，打包产物 9 个文件 / 28.7 kB，出口 0。
- **消费现状（实测）**：`/Users/jiangfeng/000mycodes/` 下共 **27** 个 `*-landing` 目录（文档声称"14 个"，严重过时），其中 26 个在 package.json 中引用了本包（v1.5.0×16 + 抽查 model-hub-landing 共 17 个，v1.3.1×7，v1.4.0×2），`rich-sim-landing` 未引用。
- **Git 状态**：本地在 `dev` 分支（跟踪 origin/dev），dev 与 main 同步；工作区干净；HEAD = `78cffdc`（v1.5.0 之后有 3 个 docs 提交未打 tag，AGENTS.md/CLAUDE.md/git-commit-message.md 均为未发布内容）。

## 二、结论摘要

| 级别 | 数量 |
|---|---|
| P0（安全问题/下游中断） | 1 |
| P1（严重缺陷） | 3 |
| P2（质量/可维护性） | 5 |
| P3（体验/规范） | 2 |

**最关键 3 条**：
1. **P0 — `Icon.astro` 用 `set:html` 渲染按 `name` 查找的字符串**：`name` 来自 Astro.props（下游站点源码控制，非终端用户输入），当前无实际漏洞，但这是本仓唯一的高危 API；未知名称静默渲染空 SVG 且无告警。需显式文档化"name 非用户输入"约定或改为编译期白名单。
2. **P1 — 3 个仓库仍保留本地 `Icon.astro` 副本并在实际使用**（vfx-todo、tab-manager、shareit），直接违背本仓"替代散落副本、单一事实源"的立项目的，图标修复不会同步到这些站点。
3. **P1 — 9/26 个消费方停留在旧 tag**（7×v1.3.1、2×v1.4.0），其中 7 个 v1.3.1 仓库的 exports 表里没有 `./lib/releases`，该版本连 `lib/` 目录都不存在；若有任何一个 v1.3.1 站点照 README 写 `import ... from '@bay/landing-ui/lib/releases'` 会直接 404 构建失败。版本碎片化无任何自动提醒机制。

## 三、逐条发现

### P0 — 安全问题 / 下游中断

**P0-1 `Icon.astro` 的 `set:html` 渲染路径——唯一高危 API，依赖"调用方是站点作者"的隐含信任假设**
- 位置：`components/Icon.astro:67`（`const innerSvg = iconPaths[name] || '';`）、`:81`（`set:html={innerSvg}`）
- 证据：`innerSvg` 只可能来自本文件硬编码的 53 条 Lucide path（L13–65），`name` 无法注入任意字符串（未知名命中 `|| ''`）。因此**当前不可被 XSS 利用**。
- 影响：风险不在当下，而在契约层面——53 个下游组件（其中部分站点把 `name` 从 content collection / frontmatter 传入）如果未来有人把图标数据外置成 JSON/CMS，同样的写法立刻变成存储型 XSS。另外未知名静默输出空 `<svg>`（无 fallback、无构建告警），拼写错误表现为"图标凭空消失"，14+ 个站点排障成本高。
- 修复建议：(a) README 与 JSDoc 明确"`name` 必须是源码常量，禁止来自用户/CMS 输入"；(b) Astro frontmatter 中对未知名 `console.warn` 一次（构建期输出，零运行时成本）。

### P1 — 严重缺陷

**P1-1 单一事实源目标未达成：3 个下游仍内置本地 `Icon.astro` 副本且被实际引用**
- 位置（下游，非本仓，但直接否定本仓价值主张）：
  - `vfx-todo-landing/src/components/FeatureGrid.astro:5` → `import Icon from './Icon.astro'`（本地副本 `vfx-todo-landing/src/components/Icon.astro` 存在）
  - `tab-manager-landing/src/components/{Privacy,Hero,FeatureCard,CTA,WhyGarden,HowItWorks,Navbar}.astro` 全部 `import Icon from "./Icon.astro"`
  - `shareit-landing/src/components/sections/{StorageModes,Features,PainPoints}.astro` → `import Icon from '../Icon.astro'`
- 证据：上文 grep 输出；这 3 个仓 package.json 均同时声明了 `@bay/landing-ui` 依赖（tab-manager 甚至 pin v1.5.0 且 node_modules 里装好了共享版），即"装着共享包却用本地副本"。
- 影响：AGENTS.md L7 声称"替代散落在 14 个落地页仓库里的 Icon.astro/global.css 副本，保持单一事实源"——对图标这一项实际只完成了 23/26。共享仓修图标、加图标不会惠及这 3 个站；副本内容已与共享版漂移（未逐一 diff，标"未确认漂移程度"）。
- 修复建议：本仓无需改代码；建议在 README 增加一节"迁移检查清单"（删除本地 Icon.astro + 全局替换 import 路径），并由 owner 在 3 个下游执行迁移。

**P1-2 版本碎片化：9/26 消费方锁定旧 tag，v1.3.1 组缺失 `lib/releases` 出口**
- 证据（实测全部 26 个消费仓的 package.json）：
  - v1.3.1×7：agent-dev、know-collect、one-world、pr-helper、shareit、splity、toclick
  - v1.4.0×2：soft-desk、vfx-todo
  - v1.5.0×17：其余
- 关键事实：`git show v1.3.1:package.json` 的 exports 只有 styles + 4 个组件，**没有 `./lib/releases`**；`git ls-tree v1.3.1 lib/` 为空——v1.3.1 连 lib/ 目录都不存在（`git log v1.3.1..v1.5.0` 确认 lib/releases 是 v1.4.0 引入的 `f7c906a`，`isSafari` 是 v1.5.0 引入的 `8b7f4a9`）。
- 影响：splity 等 7 个站点与 README（描述 v1.5.0 用法，含 lib/releases 示例）之间存在契约鸿沟——作者照 README 给 splity 加下载按钮会立刻遇到 ESM 出口 404。实测确认 v1.3.1 组当前没人 import lib/releases（grep 全部 27 仓，lib/releases 的 10 处引用全在 v1.4.0/v1.5.0 仓），所以是"地雷"而非"已爆"。另外 v1.3.1→v1.5.0 对组件层是**纯新增**（`git diff v1.3.1 v1.5.0 --stat`：只动 README/lib/package.json，组件与 tokens 零改动），升级零风险却没有发生，说明缺少升级提醒机制。
- 修复建议：在 README 增加"各版本出口能力矩阵"（v1.3.1 无 lib/releases / v1.4.0 无 isSafari / v1.5.0 全量）；用一次脚本批量把 9 个旧 tag 仓升到 v1.5.0（组件零 diff，可安全批量 PR）。

**P1-3 文档声称的下游规模"14 个"与实际 27 个严重不符，CLAUDE.md 依赖的单一事实源已过时**
- 证据：AGENTS.md L7、L32、README.md L5 均写"14 repositories"；实测 `ls -d /Users/jiangfeng/000mycodes/*-landing | wc -l` = 27（含未接入的 rich-sim-landing）。
- 影响：AGENTS.md 是 AI agent 的入口文档，"14 个站点共用、改动是破坏性的"这一心智模型在 27 个站点的现实下被严重低估——改一个令牌名影响面是文档声称的近 2 倍，而文档没有提供下游清单，无法评估影响半径。
- 修复建议：README/AGENTS.md 更新为实际数量，或改为动态表述（"全部 `*-landing` 仓库，当前 26 个已接入"）并附一份下游清单（可脚本生成）。

### P2 — 质量 / 可维护性

**P2-1 零测试、零 CI、零 lint：发布流程只有"打 tag"一道人工闸门**
- 证据：仓库无 `__tests__`、无 `*.test.*`、无 `.github/workflows/`（`ls -a` 确认无 .github 目录）、package.json 无 `scripts` 字段（全文 29 行，无 devDependencies）。README"Release checklist"5 步全是手工操作，唯一可自动验证的 `npm pack --dry-run` 本次评审人工执行通过。
- 影响：`exports` 登记遗漏（AGENTS.md L20 明确警告过这类事故）、`.d.ts` 与 `.js` 签名漂移、SVG path 语法错误，都要等到下游 `npm install` 后构建才暴露，而此时 tag 已推送、远端公开。
- 修复建议：最小代价方案——加一个 `scripts.check`：node 脚本校验 (a) `lib/releases.js` 可被 `import` 且导出与 `releases.d.ts` 声明一致，(b) exports 指向的文件全部存在，(c) Icon.astro 的 iconPaths 可被 XML 解析。接入 GitHub Actions 作为 tag 前置检查。

**P2-2 `lib/releases.js` 的 `isSafari()` UA 检测把 iOS 版 Chrome/Firefox 误判为 Safari**
- 位置：`lib/releases.js:26`
- 证据：正则 `/^((?!chrome|chromium|android|edg).)*safari/i` 排除了桌面 Chrome/Edge/Android，但**未排除 `CriOS`（iOS Chrome）与 `FxiOS`（iOS Firefox）**——这两个 UA 含 "safari" 字样且不含被排除关键字，会返回 true。
- 影响：代码注释自述用途是"浏览器插件按浏览器分发"（Chrome 插件 vs Safari 插件）。iOS 上点击 Chrome 插件下载按钮的用户会被导向 Safari 版本。属于逻辑缺陷但后果有限（iOS 本身装不了桌面插件，用户会在商店页发现问题）。README L120-122 对排除法的说明也未提及 CriOS/FxiOS。
- 修复建议：正则排除项加 `crios|fxios`；补一行注释说明取舍。

**P2-3 `fetchLatestAssets` 无超时与无限流：GitHub API 未认证限流 60 次/小时/IP 会成为静默失败源**
- 位置：`lib/releases.js:48-50`（裸 `fetch`），`:68-70`（catch 一切 → `error: true`）
- 证据：无 `AbortSignal`、无重试、无对 403/429 的区分。README L124-127 已正确引导"error 时按钮停在 fallback"，所以 UX 有兜底。
- 影响：Cloudflare Pages 访客与 GitHub API 之间是浏览器直连，共享出口 IP 极易撞 60/h 限流，下载按钮长期停在 releases 页兜底链接——功能"活着但降级"，无任何可观测性。文档未提醒这一限流特性。
- 修复建议：README 的 lib/releases 章节注明未认证限流 60/h/IP 与各端点共用额度；可选：fetch 加 `AbortSignal.timeout(8000)`（Safari 16+ 支持）防止悬挂。

**P2-4 `BayjfMark.astro` 用 `Math.random()` 生成渐变 id——SSR/CSR 混合渲染时存在 id 不稳定隐患**
- 位置：`components/BayjfMark.astro:12`（`Math.random().toString(36).slice(2, 8)`）
- 证据：Astro 纯 SSG 场景下每个实例构建期生成一次，同页 nav+footer 两个实例 id 不同，注释（L9-11）说明的重复 id 问题已解决。但 (a) 随机 id 使同一页面两次构建输出不同 HTML，破坏构建产物可重现性（影响缓存 diff/完整性校验）；(b) 若未来某下游在 React island 里水合包含该组件的 HTML（当前无人这么做，未确认），SSR/CSR 随机值不一致会导致渐变引用错配。
- 影响：当前无实际故障，属于健壮性与可重现性债。
- 修复建议：改用确定性计数器（模块级 `let i = 0` + `bayBg-${i++}`），构建期内同样保证唯一，且输出可重现。

**P2-5 tokens.css 的暗色优先 surface 令牌对亮色站点是陷阱，且 `.lui-btn-ghost` 在亮色背景下可能不可见**
- 位置：`styles/tokens.css:46-49`（`--lui-surface: rgb(255 255 255 / 0.04)` 等暗色优先值）、`:86-93`（`.lui-btn-ghost` 无背景、文字色 = accent，hover 仅 underline）
- 证据：注释自述"dark-first; light sites override these"，但 `.lui-btn-ghost` 的颜色继承链没有任何保护措施——亮色站点若忘记 override `--lui-accent` 为深色变体，默认 `#10b981`（ emerald-500 ）在白底上对比度约 2.3:1，低于 WCAG AA 4.5:1（数值为工具常识计算，未实测渲染，标"对比度数值未实测"）。
- 影响：可访问性风险转嫁给每个下游"记得 override"；`.lui-btn-ghost:hover` 只有 underline 变化，feedback 偏弱。
- 修复建议：README tokens 章节加亮色站点的 minimum override 清单（accent + surface 三件套）；或在 tokens.css 用 `prefers-color-scheme` 提供亮色默认值。

### P3 — 体验 / 规范

**P3-1 README/AGENTS.md 中图标数量"约 45 个"与实际 53 个不符**
- 证据：README L12、AGENTS.md L14 写"~45 icons"；实测 `grep -c '^  [A-Za-z0-9]*:' components/Icon.astro` = 53。
- 修复建议：改为实际数量或干脆写"50+"。

**P3-2 `.lui-card` 无条件 hover 提亮，对不可点击的纯展示卡片产生误导性 affordance**
- 位置：`styles/tokens.css:103-105`（`.lui-card:hover { background: var(--lui-surface-hover) }`）
- 证据：hover 效果挂在基础类上，无论卡片是否是链接/按钮。
- 影响：轻微 UX 问题——静态卡片 hover 变化暗示可点击。
- 修复建议：拆成 `.lui-card`（静态）与 `.lui-card-interactive`（带 hover），或文档注明"仅交互卡片使用"。此为破坏性变更，需按 P1-3 的实际影响面（26 仓）评估后再做。

### 维度结论补充（无单独发现项的部分）

- **约定符合性（返链/GitHub 链接）**：`BayjfLink.astro:19-24` 内建 `href="https://bayjf.com" target="_blank" rel="noopener noreferrer"`，完全符合约定；`StarOnGithub.astro:23-26` 同样带 `target="_blank" rel="noopener noreferrer"`。GitHub 链接格式（`bayernjf/xxx`）由调用方传 href，本仓不强制校验（README 示例均为正确格式）。实测 14 个使用 StarOnGithub 的下游 href 全部为 `https://github.com/bayernjf/<repo>` 格式，无一漂移。
- **外链 rel 属性**：全仓 2 处外链组件均带 `noopener noreferrer`，无遗漏。
- **错误处理**：`fetchLatestAssets` 的 catch-all + fallback 设计正确且有文档引导；`formatBytes(0/负数)` 返回空串行为合理。
- **依赖健康**：零运行时依赖（符合 AGENTS.md L35 硬约束）；`exports` 与实际文件 100% 对应（npm pack dry-run 验证 9 文件）；`files` 白名单含 `lib`（v1.4.0 起补入，v1.3.1 的 `files` 无 `lib` 但那时也无 lib，历史一致）。
- **响应式**：组件不自带 display/宽度约束（BayjfLink L15-17、StarOnGithub L17-21 注释明确这是刻意设计，把 `hidden sm:block` 等工具类控制权留给宿主），响应式责任在下游——设计自洽，未发现缺陷。
- **git-commit-message.md**：与 bayjf 仓规则同源，无冲突。

## 四、验证门实际执行结果

本仓 `package.json` **无任何 scripts**（无 test/build/lint 可跑）。可执行的只读验证如下：

| 命令 | 退出码 | 关键输出 |
|---|---|---|
| `npm pack --dry-run`（在 landing-ui 内） | 0 | 9 files、28.7 kB unpacked、name/version 正确；未在仓库写入 tgz（dry-run 默认只打印），`git status --porcelain` 复核为空 |
| `git tag -l` vs `git ls-remote --tags origin` | 0 | 本地远端 tag 完全一致：v1.0.0–v1.5.0 共 7 个 |
| `git log --oneline main..dev` / `dev..main` | 0 | 均为空，两分支同步 |
| `git diff v1.3.1 v1.5.0 --stat` | 0 | 仅 README/lib/package.json 变更，组件与 tokens 零 diff（证实旧 tag 升级零风险） |
| `gh repo view bayernjf/landing-ui --json visibility` | 0 | `"PUBLIC"`，git tag 引用安装无需凭据的文档声称成立 |
| 下游 27 仓 package.json 逐个人工核对 | — | 26 仓引用本包（17×v1.5.0 / 7×v1.3.1 / 2×v1.4.0），rich-sim-landing 未引用 |
| 下游本地 Icon.astro 副本扫描 | — | vfx-todo、tab-manager、shareit 三仓存在且被 import（见 P1-1） |
| 下游 lib/releases 引用扫描 | — | 10 处引用全部位于 v1.4.0/v1.5.0 仓，旧 tag 仓暂无踩雷 |

未执行项及原因：无测试可跑（仓内无测试）；未在任何下游仓执行 `npm install`/构建（会改写 node_modules 与 lockfile，超出只读授权）。

## 五、修复优先级建议

1. **先补文档与契约（零风险，今天可做）**：README 加版本出口能力矩阵 + 下游真实数量/清单 + 图标数量更正 + CriOS/FxiOS 说明 + GitHub API 限流提示（覆盖 P1-2、P1-3、P2-2、P2-3、P3-1）。改完按 checklist 打 v1.5.1（docs only）。
2. **消除图标副本分裂（下周）**：按 P1-1 的迁移清单处理 vfx-todo、tab-manager、shareit 三仓（删本地副本、改 import）；同时把 9 个旧 tag 仓批量升 v1.5.1（组件零 diff，可脚本化提 PR）。
3. **加最小验证门（下次功能改动前）**：P2-1 的 check 脚本 + tag 前置 CI，防止 exports 漏登记和 d.ts 漂移。
4. **代码层改进（跟随下一次 minor）**：Icon 未知名构建期 warn（P0-1b）、BayjfMark 确定性 id（P2-4）、isSafari 排除 CriOS/FxiOS（P2-2）、fetch 超时（P2-3）。`.lui-card` hover 拆分（P3-2）与 tokens 亮色默认值（P2-5）属行为变更，单独按 26 仓影响面评估，不与前述捆绑。
