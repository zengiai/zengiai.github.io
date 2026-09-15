# Test Report

## Feature

- Feature slug: `docs-line-style`
- Owner role: `qa-tester`
- Current state: `Test Verification`
- Previous state: `Code Review`
- Next state: `Release Ready`

## 1. Test Objective

确认技术文章页在「线条化视觉 + 字号收敛」改造后：无卡片 / 方框 / 阴影残留、字号按预期下调、桌面与移动端布局正常、文章切换与深链接行为无回归、窄屏无横向溢出。

## 2. Test Scope

- 页面：`/pages/docs/`（含 `?doc=` 深链接与侧栏切换）。
- 组件：侧栏列表项与标签、文章头部与元信息、正文标题 / 段落 / 列表 / 引用 / 代码块 / 表格 / 分隔线、状态提示块、站点头部导航。
- 视口：1280×900（桌面）、390×844（移动）。
- 兼容目标：Chromium 内核（Playwright）。

## 3. Non-Test Scope

- Safari / Firefox 真机渲染。
- 视觉像素级比对（未保留改动前基线截图）。
- 其他页面（简历首页、提示词页、Aura 工具）。
- 文章内容正确性（`.md` 与索引未改动）。

## 4. Test Cases

| Case | Type | Steps | Expected result | Actual result | Status |
| --- | --- | --- | --- | --- | --- |
| 样式审计（去框化） | 计算样式 | 遍历 `body *`，统计 `border-radius > 0` / `box-shadow != none` / 非透明背景 | 无圆角、无阴影；非透明背景仅页面底色 | 0 圆角、0 阴影；仅 `page-shell` / `site-header` 两处底色 | Pass |
| 桌面字号核对 | 计算样式 | 1280×900 读取正文与标题 `font-size` | 正文 14.4px、正文 h2 16.64px、文章标题 23.36px、页面标题 30.4px | 与预期完全一致 | Pass |
| 代码块 / 引用线条化 | 计算样式 | 打开 `?doc=SSE_MESSAGE_SPEC` 读取 `pre` / `blockquote` | 透明底、仅左竖线、无圆角无阴影 | `pre` 左竖线 2px、`blockquote` 左竖线 2px、背景透明 | Pass |
| 表格书式横线 | 计算样式 | 读取 `thead th` / `tbody td` 边框 | 仅表头下线与行上线，无四周边框 | `th` 下线 1px、`td` 上线 1px，单元格无其他边框 | Pass |
| 状态提示块 | 注入探针 | 追加 `.state-message` 元素读取样式 | 透明底 + 左竖线，无方框 | 透明底、左竖线 2px、13.44px | Pass |
| 侧栏切换与深链接 | 交互 | 点击侧栏条目并观察 URL / 标题 / 选中态 | URL 同步 `?doc=`、标题与选中态正确 | `?doc=agent-runtime-7x24-development-diary`，标题同步，选中项竖线 `#8a6a3d` | Pass |
| 移动端横向溢出 | 响应式 | 390×844 打开含宽表格文章，比较 `scrollWidth` / `clientWidth` | 无横向滚动 | 修复前 443/390（28 处元素越界）→ 修复后 390/390、0 处越界 | Pass |
| 移动端截图 | 视觉 | 390×844 截图（列表 / 表格 / 代码块） | 单栏、线条分割、表格自适应 | 符合预期，无卡片 / 方框 | Pass |
| 桌面截图 | 视觉 | 1280×900 截图（默认文章 / 引用区） | 双栏 + 阅读栏左竖线、h2 顶线 | 符合预期 | Pass |
| Console 检查 | 运行时 | 读取页面 console | 0 error / 0 warning | 0 error / 0 warning | Pass |

## 5. Automation Suggestions

- 将「样式审计」脚本固化为轻量回归用例：断言页面内 `border-radius > 0`、`box-shadow != none` 计数为 0，字号断言取 `:root` 与关键选择器。
- 将 390px 视口 `scrollWidth == clientWidth` 作为移动端回归断言。
- 将侧栏切换 + `?doc=` 同步保留为 E2E 用例（已有 `04_DEVELOPMENT.md` 中的验证路径）。

## 6. Defects

| Defect | Severity | Reproducible? | Owner | Status |
| --- | --- | --- | --- | --- |
| 移动端宽表格溢出（改造前既有问题） | P2 | Yes | dev | Fixed（`overflow-wrap: anywhere`） |

## 7. Regression Scope

- 文章切换、`?doc=` 深链接、`popstate` 回退。
- 索引 / 正文加载失败时的状态提示渲染。
- 站点头部导航（Resume / Docs / Projects / Contact）样式与点击。
- 移动端断点 860px 与 560px 的布局切换。

## 8. Release Criteria

`RELEASE_READY`

Evidence:

- 上述 10 项用例全部 Pass；Console 0 error / 0 warning。
- 计算样式证据：正文 14.4px、正文 h2 16.64px、文章标题 23.36px、页面标题 30.4px；页面 0 圆角、0 阴影。
- 移动端 390×844 无横向滚动；桌面 1280×900 双栏与线条分割正常。

## 9. Residual Risk

- 移动端表格内长英文标识符折行（取舍项，非缺陷）。
- Safari / Firefox 未实测；真机移动端未验证。
- 上线后如需观察，重点看文章切换与移动端是否出现横向滚动。

## 10. Rollback Target

If blocked, return to `Development`.

Reason:

- 当前无阻塞项；如需回退，仅 `git revert` 本次样式与版本参数变更。

## 11. State Trace

| Time | State | Decision | Rollback count | Notes |
| --- | --- | --- | --- | --- |
| 2026-09-15 | Test Verification | RELEASE_READY：10 项用例通过，附带修复移动端表格溢出 | 0 | 证据见第 4 / 8 节 |
