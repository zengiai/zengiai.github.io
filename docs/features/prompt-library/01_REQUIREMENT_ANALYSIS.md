# Requirement Analysis

## Feature

- Feature slug: `prompt-library`
- Request date: 2026-09-15
- Owner role: `requirement-analyst`
- Current state: `Requirement Analysis`
- Next state: `Solution Design`

## 1. Requirement Summary

在 `zengiai.github.io` 静态站点中新增一个独立的提示词分享页面，通过 `https://zengiai.github.io/pages/prompts/` 直接访问。页面采用羊皮纸白（`#fdfbf7`）极简主义风格，提供侧边栏列表、点击切换内容与一键复制能力，数据由独立 JSON 文件驱动，便于后续维护提示词内容。

用户补充要求（2026-09-15）：

- 页面保持独立，不与站点公共顶部导航栏（Resume / Docs / Projects / Contact）建立关联，也不在其他页面导航中加入入口；
- `prompts.json` 默认内容为空数组，由使用者后续自行录入提示词。

用户第二轮调整（2026-09-15）：

- 视觉改为线条分割（顶线 / 竖线 / 底线 / 下划线），不使用卡片或方框，避免 AI 化的框式设计；
- 字体规范：中文使用苹方（PingFang SC），英文使用 Times New Roman，代码使用 Google Sans Code；
- 新增一篇「SPEC 开发规范设计」提示词（Spec-Driven Development）。

用户第三轮调整（2026-09-15）：

- 正文展示由「按原文逐行展示」升级为 Markdown 渲染（标题、列表、引用、围栏代码块、表格、分隔线、行内加粗 / 斜体 / 行内代码 / 链接）；
- 一键复制必须复制原文（`prompts.json` 中的 Markdown 源文），与页面渲染解耦；
- 英文字体由 Times New Roman 调整为 Apple 系统字体（SF Pro / `-apple-system`），与中文苹方统一为 Apple 字体体系。

## 2. Scope

- 新增 `pages/prompts/index.html`、`pages/prompts/assets/prompts.css`、`pages/prompts/assets/prompts.js`、`pages/prompts/prompts.json` 四个文件。
- 侧边栏按分类分组列出全部提示词标题，点击切换主内容区。
- 内容区展示标题、分类、更新时间、摘要、标签与正文，提供一键复制按钮。
- JSON 为空时展示空状态引导；数据文件加载失败时展示错误状态；不存在的 `?p=` 参数回退首条。
- 支持 `?p=<slug>` 深链接、`history.pushState` / `popstate`。
- 响应式：桌面双栏（sticky 侧栏），移动端单栏（标题变为横向滚动胶囊）。
- 页面不引用其他页面导航，也不被其他页面引用。

## 3. Non-Scope

- 不改动首页（`index.html`）、简历页（`pages/resume/`）、文章页（`pages/docs/`）的任何内容。
- 不新增构建工具、不引入第三方框架或运行时依赖（仅沿用站点已有的 Google Fonts）。
- 不做提示词编辑、搜索、收藏、后端接口等动态能力。
- 不包含预置提示词数据，`prompts` 数组默认空。

## 4. Main Flow

1. 用户访问 `/pages/prompts/`。
2. 页面 fetch `./prompts.json` 并渲染侧边栏分组列表与数量。
3. 页面默认选中第一条（或 `?p=` 指定条目），渲染内容区与复制按钮。
4. 用户点击侧边栏条目，内容区无刷新切换，URL 同步为 `?p=<slug>`。
5. 用户点击“复制提示词”，内容写入剪贴板，按钮反馈“已复制”，约 2.2 秒后复原。
6. 数据为空时，侧边栏显示“暂无提示词。”，内容区显示空状态引导，复制按钮禁用。

## 5. Exception Flow

- 数据文件加载失败（HTTP 错误、非法 JSON）：侧边栏与内容区展示错误提示，复制按钮禁用，控制台输出错误。
- `?p=` 指向不存在的 slug：回退展示第一条提示词。
- `prompts` 数组为空：空状态引导，不选中任何条目。
- 剪贴板 API 不可用（非 secure context）：降级为 `document.execCommand("copy")`；仍失败时按钮显示“复制失败，请手动选择”。
- 重复点击复制：重置定时器，按钮状态不叠加。

## 6. Ambiguity and Questions

| Question | Impact | Owner | Status |
| --- | --- | --- | --- |
| 页面自身是否需要保留极简品牌标识 | 视觉定位 | user | Resolved：用户明确“单独页面，不要跟顶部栏关联”，故完全移除顶部栏 |

## 7. Non-Functional Requirements

- Peak QPS: 静态托管，无特殊要求。
- RT 99: 首屏渲染依赖一次本地 JSON fetch，目标 < 200ms（本地网络）。
- Availability: 跟随 GitHub Pages。
- Compatibility: 现代浏览器（Chrome / Safari / Firefox / Edge）表现一致；移动端（≤ 960px 断点）单栏自适应。
- Security: 全部动态内容经 `escapeHtml` 转义后注入，杜绝 XSS；无用户输入、无凭证。
- Observability: 前端错误输出至 console；静态页面无服务端指标。
- Rollback: 纯静态文件，`git revert` 即可回滚。

## 8. Acceptance Criteria

- Given 访问 `/pages/prompts/`，When 页面加载完成，Then 无站点顶部导航栏，展示“提示词集”标题区与双栏布局。
- Given `prompts.json` 为 `{ "updated": "...", "prompts": [] }`，When 页面加载完成，Then 侧边栏显示“暂无提示词。”且数量为 0，内容区显示空状态引导，复制按钮禁用。
- Given 存在提示词数据，When 点击侧边栏任一条目，Then 内容区切换为对应内容，URL 变为 `?p=<slug>`，选中项高亮。
- Given 选中某条提示词，When 点击“复制提示词”，Then 剪贴板内容与 `content` 字段完全一致，按钮显示“已复制”并在约 2.2 秒后复原。
- Given 直接访问 `?p=<slug>`，When 页面加载完成，Then 直接展示该条提示词。
- Given 视口宽度 ≤ 960px，When 页面渲染，Then 切换为单栏布局，列表变为横向滚动胶囊。

## 9. State Trace

| Time | State | Decision | Rollback count | Notes |
| --- | --- | --- | --- | --- |
| 2026-09-15 | Requirement Analysis | 需求明确直接进入设计 | 0 | 用户追加“独立页面、默认内容为空”约束 |
| 2026-09-15 | Requirement Analysis | 第二轮调整：线条化视觉 + 字体规范 + 新增 SDD 提示词 | 0 | 需求明确，直接进入实现 |
| 2026-09-15 | Requirement Analysis | 第三轮调整：正文 Markdown 渲染 + 复制保持原文 + 英文字体改 Apple | 0 | 需求明确，直接进入实现 |
