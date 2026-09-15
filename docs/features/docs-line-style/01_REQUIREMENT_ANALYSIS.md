# Requirement Analysis

## Feature

- Feature slug: `docs-line-style`
- Request date: 2026-09-15
- Owner role: `requirement-analyst`
- Current state: `Requirement Analysis`
- Next state: `Solution Design`

## 1. Requirement Summary

技术文章页（`pages/docs/`）按 `prompt-library` 已落地的「线条化视觉」规范做二次收敛：全面移除卡片、方框与阴影，仅保留顶线 / 竖线 / 底线作为内容分割；同时下调正文与标题字号，提升阅读舒适度与留白比例。设计规范依据 `docs/features/prompt-library/02_SOLUTION_DESIGN.md`，样式实现令牌与布局逻辑参考 `pages/prompts/assets/prompts.css`。

## 2. Scope

- 重写 `pages/docs/assets/docs.css`：以 `prompts.css` 的设计令牌（`--paper` / `--ink-strong` / `--ink` / `--ink-soft` / `--ink-faint` / `--line` / `--line-strong` / `--accent` / `--font-main` / `--font-code`）替换原白底灰框色板。
- 去卡片 / 方框 / 阴影：文章列表项、标签、行内代码、代码块、引用、表格、状态提示块全部线条化，全页不出现 `border-radius > 0` 与 `box-shadow`。
- 字号收敛：页面标题、文章标题、正文、列表、代码、表格、元信息与侧栏条目统一下调一档。
- 同步更新 `pages/docs/index.html` 中 `docs.css` 的资源版本参数，降低缓存命中旧样式的概率。
- 附带修复：窄屏下宽表格撑破阅读栏导致的横向溢出。

## 3. Non-Scope

- 不改动 `pages/docs/assets/docs.js` 的任何逻辑（取数、Markdown 渲染、深链接、复制），DOM 类名保持兼容。
- 不改动文章内容文件（`pages/docs/articles/*.md`、`pages/docs/articles/index.json`）。
- 不改动简历首页（`index.html` / `pages/resume/`）、提示词页（`pages/prompts/`）与 Aura 工具。
- 不新增字体、依赖与构建工具；页面仍沿用站点已有的 Google Sans Code 字体链接。

## 4. Main Flow

1. 访客打开 `/pages/docs/`，页面 fetch `articles/index.json` 并渲染侧栏列表。
2. 侧栏条目为纯文本行 + 左侧 2px 竖线，选中项竖线转为强调色（`--accent`）。
3. 内容区渲染 Markdown：正文 h2 带顶线、引用与代码块带左竖线、表格为书式横线、分隔线为横线。
4. 视口 ≤ 860px 切换单栏，内容区去掉左竖线，阅读字号再降一档。

## 5. Exception Flow

- 文章索引 / 正文加载失败：`state-message` 以左竖线样式呈现，无方框背景。
- `?doc=` 失效：仍由 `docs.js` 回退首条，样式层不引入新分支。
- 超长代码行与宽表格：代码块 `pre-wrap` 自动换行；表格单元格 `overflow-wrap: anywhere`，保证 390px 视口无横向滚动。

## 6. Ambiguity and Questions

| Question | Impact | Owner | Status |
| --- | --- | --- | --- |
| 用户未点名具体页面，仅给出「移除卡片 / 方框 / 阴影 + 字号偏大」并要求参考 prompts 页 | 改动范围 | user | Resolved：判定目标为「技术文章页」（现状最贴合卡片化描述，且与 prompts 页共用「侧栏 + 阅读栏」布局逻辑）；如需把同一规范推广到简历页，另开需求 |
| 是否连带采纳 prompts 的羊皮纸白配色 | 视觉一致性 | user | Resolved：按「参考 prompts.css 中的 CSS 变量」的表述采纳同一套令牌 |

## 7. Non-Functional Requirements

- Peak QPS: 静态托管，无特殊要求。
- RT 99: 纯 CSS 变更，不新增网络请求；首屏仍为一次索引 fetch + 一次正文 fetch。
- Availability: 跟随 GitHub Pages。
- Compatibility: 现代浏览器（Chrome / Safari / Firefox / Edge）；响应式断点沿用 860px 与 560px。
- Security: 不涉及脚本与内容变更，XSS 面不变。
- Observability: 前端错误仍统一 `console.error`，页面以可见状态块替代静默失败。
- Rollback: 单 CSS 文件 + 版本参数，`git revert` 即完全回滚。

## 8. Acceptance Criteria

- Given 桌面视口，When 打开 `/pages/docs/`，Then 页面内不存在卡片边框、圆角与阴影，分割完全由顶线 / 竖线 / 底线完成。
- Given 打开任一文章，When 渲染完成，Then 代码块与引用为左竖线样式、表格仅保留表头下线与行上线、行内代码无底色。
- Given 视口 1280×900，When 读取计算字号，Then 正文 ≤ 14.4px、正文 h2 ≤ 16.6px、文章标题 ≤ 23.4px、页面标题 ≤ 30.4px。
- Given 视口 390×844 与含宽表格的文章，When 页面渲染，Then `scrollWidth == clientWidth`（无横向滚动）。
- Given 点击侧栏条目，When 切换文章，Then URL 同步 `?doc=`、标题与选中态正确、Console 0 error / 0 warning。

## 9. State Trace

| Time | State | Decision | Rollback count | Notes |
| --- | --- | --- | --- | --- |
| 2026-09-15 | Requirement Analysis | 需求明确直接进入设计 | 0 | 依据 prompts 规范收敛线条化视觉与字号 |
