# Development Record

## Feature

- Feature slug: `prompt-library`
- Owner role: `developer-agent`
- Current state: `Development`
- Previous state: `Gate Review`
- Next state: `Code Review`

## 1. Implementation Approach

- 复刻站点既有 `pages/docs/` 的实现模式（IIFE + `escapeHtml` + fetch no-cache + `?param` 深链接 + `state-message` 状态块），保证风格与维护方式一致。
- 新增 4 个文件：页面骨架、样式、逻辑、数据；零构建、零框架。
- 设计系统集中在 CSS `:root` 变量：羊皮纸白 `#fdfbf7`、暖墨色文字、衬线字体栈（Noto Serif SC / Songti SC / Georgia）。
- 桌面（> 960px）为 sticky 侧栏 + 内容卡片双栏；移动端单栏，列表切换为横向滚动胶囊（`display: contents` 展开分组）。
- 用户追加约束的落实：页面移除整块站点顶部导航（HTML 与 CSS 同步清理）；同时按要求将三处站点导航中临时加入的 Prompts 入口全部还原（`index.html`、`pages/resume/index.html`、`pages/docs/index.html` 最终与改动前一致）。
- `prompts.json` 默认 `{ "updated": "2026-09-15", "prompts": [] }`，空数据时渲染引导态。
- 第三轮迭代：正文渲染由「行扫描 + 围栏高亮」升级为 `renderMarkdown` 行级解析器（标题 / 引用 / 列表 / 任务项 / 围栏代码 / 分隔线 / 表格 / 段落 + 行内加粗、斜体、行内代码、链接、删除线），全部文本先 `escapeHtml` 后做行内转换；样式侧新增 Markdown 元素线条化排版（h2 顶线、引用左竖线、书式表格横线）。
- 第三轮迭代：字体栈英文改为 Apple 系统字体（`-apple-system` / SF Pro），中文苹方、代码 Google Sans Code 不变；资源版本参数更新为 `?v=20260915-markdown`；复制行为保持不变，仍逐字复制 `content` 原文。

## 2. Modified Files

| File | Change | Reason |
| --- | --- | --- |
| `pages/prompts/index.html` | 新增 / 迭代 | 页面骨架：intro、侧边栏、内容区、复制按钮、noscript 提示；无顶部导航；资源版本参数 `?v=20260915-markdown` |
| `pages/prompts/assets/prompts.css` | 新增 / 迭代 | 羊皮纸主题、响应式与按钮四态；线条化视觉；Apple 系统字体栈与 Markdown 元素排版 |
| `pages/prompts/assets/prompts.js` | 新增 / 迭代 | 取数、分组渲染、切换、深链接、一键复制（Clipboard + execCommand 降级）；`renderMarkdown` 行级解析器 |
| `pages/prompts/prompts.json` | 新增 / 迭代 | 数据文件；现收录 1 条 SDD 提示词（905 行 / 7661 字符） |

## 3. Transaction Boundary

不涉及（纯静态页面，无服务端与数据库）。

## 4. Cache Strategy

- `fetch("./prompts.json", { cache: "no-cache" })`：保证数据文件更新后刷新即生效。
- CSS / JS 通过 `?v=20260915-markdown` 版本参数做缓存击穿（历经 `prompt-library` → `editorial` → `markdown` 三轮迭代），后续迭代需同步更新版本号。

## 5. Thread-Safety Assumptions

不涉及多线程；前端共享状态为 `prompts`、`activeSlug`、`copyResetTimer`，均在单事件循环内串行访问，重复点击复制由定时器重置收敛。

## 6. Exception Handling

- 数据加载失败：侧边栏与内容区显示"索引加载失败 / 无法读取 prompts.json"提示，复制按钮禁用，`console.error` 输出。
- 空数据：侧边栏"暂无提示词。"，内容区空状态引导，复制按钮禁用。
- 无效 `?p=`：回退首条渲染；`loadPrompt` 中的 not-found 分支用于 popstate 场景。
- 复制失败：`is-failed` 状态提示"复制失败，请手动选择"，约 2.2 秒复原。

## 7. Validation

| Command or check | Result | Notes |
| --- | --- | --- |
| `python3 -m http.server 8907 --directory <repo>` | Pass | 静态服务验证（端口 8907，本地验证用） |
| Playwright 桌面 1280×900 截图 | Pass | 无顶部栏、双栏布局、分组列表与内容卡片正常 |
| Playwright 移动端 390×844 截图 | Pass | 单栏布局、横向胶囊列表、按钮换行正常 |
| 点击侧边栏切换 + URL 同步 | Pass | 选中"线上故障排查"后 URL 变为 `?p=incident-troubleshooting`，标题同步 |
| 一键复制 | Pass | 剪贴板内容首行 `# 角色`、长度 343，与选中条目 `content` 一致；按钮 150ms 内显示"已复制"，2.4s 后复原 |
| 深链接 `?p=system-design-review` | Pass | 直接加载指定条目 |
| 空数据状态（`prompts: []`） | Pass | 计数 0、空态文案、复制按钮 disabled |
| Console 检查 | Pass | 0 errors / 0 warnings |
| Playwright Markdown 渲染断言（第三轮） | Pass | 14×h2 / 10×h3 / 16×hr / 4×blockquote / 52×pre.prompt-code / 2×strong / 3×行内 code；无围栏标记与加粗标记泄漏 |
| 复制原文逐字校验（第三轮） | Pass | 剪贴板 = `content` 源文 7661 字符，identical；按钮显示“已复制” |
| 字体核查（第三轮） | Pass | body computed `font-family` 为 `-apple-system` 系统栈；代码块为 Google Sans Code |
| 桌面 / 移动端截图（第三轮） | Pass | h2 顶线、引用 / 代码左竖线；390×844 单栏、下划线式 active 项 |

## 8. Residual Risk

- Playwright 为 Chromium 内核验证，Safari / Firefox 的渲染差异未实测（使用标准 CSS，风险低）。
- `file://` 直开场景由浏览器拦截 fetch，页面展示错误引导文案，属预期行为。
- 手写 Markdown 解析器覆盖常用子集（标题 / 引用 / 列表 / 任务项 / 围栏代码 / 分隔线 / 表格 / 常用行内标记），非完整 CommonMark；当前数据规模下风险低。

## 9. State Trace

| Time | State | Decision | Rollback count | Notes |
| --- | --- | --- | --- | --- |
| 2026-09-15 | Development | 完成实现并按用户约束移除顶部栏关联 | 0 | 临时导航入口已全部还原 |
| 2026-09-15 | Development | 第三轮：Markdown 渲染 + Apple 字体 + 版本参数更新 | 0 | 复制保持原文不变 |
