# Solution Design

## Feature

- Feature slug: `docs-line-style`
- Owner role: `solution-architect`
- Current state: `Solution Design`
- Previous state: `Requirement Analysis`
- Next state: `Gate Review`

## 1. Scenario Analysis

- 场景：个人站点技术文章阅读页（`pages/docs/`）的视觉收敛，访客浏览文章、切换文章。
- 影响路径：仅 `pages/docs/` 自身的样式与资源版本参数，不触碰站点其他页面与部署链路。
- 用户角色：站点访客（只读）；内容维护者（继续直接编辑 Markdown）。

## 2. Traffic Model Assumptions

- Peak QPS: 个人站点量级，可忽略。
- RT 99 target: 首屏 < 1s（GitHub Pages + 索引 JSON + 单篇 Markdown）。
- Data volume: 当前 8 篇文章索引 + 单篇 Markdown，无体积变化。
- Hotspot risk: 无。
- External dependency assumptions: 仅 Google Fonts（Google Sans Code，用于代码类文本）；字体不可达时回退 Consolas / Menlo / monospace。

## 3. Architecture Design

- 变更范围收敛为「设计令牌 + 组件层」两层，均落在单个样式文件内：

```text
pages/docs/
|-- index.html            # 仅资源版本参数更新
`-- assets/
    |-- docs.css          # 全部改动：令牌替换 + 线条化组件 + 字号阶 + 响应式
    `-- docs.js           # 不改动（DOM 类名与结构保持不变）
```

- 令牌层：与 `pages/prompts/assets/prompts.css` 对齐（`--paper #fdfbf7`、`--ink-strong`、`--ink`、`--ink-soft`、`--ink-faint`、`--line`、`--line-strong`、`--accent #8a6a3d`、`--font-main` Apple 系统字体栈、`--font-code` Google Sans Code）。
- 组件层线条化映射：

| 组件 | 改动前 | 改动后 |
| --- | --- | --- |
| `.article-card` | 1px 边框 + 8px 圆角 + 白底 + hover 灰底 | 透明、无边框、无圆角；左侧 2px 竖线，选中转 `--accent` |
| `.article-card-tag` | 胶囊边框 + 内边距 | 纯文本 + `·` 分隔符 |
| `.markdown-body code` | 灰底 chip + 圆角 | 纯等宽文本，无底色 |
| `.markdown-body pre` | 深色底 + 边框 + 圆角 | 透明底 + 左侧 2px 竖线，`pre-wrap` 换行 |
| `.markdown-body blockquote` | 灰底块 + 左粗线 | 仅左竖线 |
| `.markdown-body table` | 全网格边框 + th 灰底 | 书式横线：表头下线 + 行上线，单元格仅右侧留白 |
| `.markdown-body h2` | 无顶线 | 新增顶线（书式分割） |
| `.state-message` | 边框 + 圆角 + 灰底盒 | 仅左竖线 |
| `.doc-reader` | 无竖线 | 桌面新增左侧 1px 竖线；≤ 860px 移除 |

- 字号阶（1280×900 / 根字号 16px，改动前 → 改动后）：页面标题 48 → 30.4px；文章标题 35.2 → 23.4px；文章摘要 15.7 → 14.1px；正文 15.7 → 14.4px；正文 h1 27.5 → 20.2px；正文 h2 21.4 → 16.6px；正文 h3 17.9 → 15.4px；代码块 13.8 → 13.1px；表格 14.7 → 13.8px；侧栏条目 15.7 → 14.4px；标签 11.8 → 11.5px；元信息行 13.1 → 12.2px。
- 留白补偿：正文行高 1.82 → 1.9，标题上下间距按 `em` 放大（h2 顶部 2.1em + 顶线），阅读栏左内边距 40px，布局顶部间距 30px，页面内边距 38 → 40px。

## 4. Data Model Design

- 无数据模型变更；`articles/index.json` 与文章 Markdown 均不改动。

## 5. Interface and Module Boundaries

| Module | Responsibility | Upstream | Downstream | Notes |
| --- | --- | --- | --- | --- |
| `docs.css` | 令牌、线条化组件、字号阶、响应式 | 无 | 字体链接 | 设计变量集中于 `:root` |
| `docs.js` | 取数、Markdown 渲染、切换、深链接 | `articles/index.json` | DOM | 本次零改动；类名契约不变 |
| `index.html` | 结构骨架 | 无 | docs.css / docs.js | 仅 `?v=` 版本参数更新 |

- 契约约束：`.article-card` / `.is-active` / `.article-card-tag` / `.state-message` / `.doc-reader` 等类名必须保持存在，样式变更不得要求 JS 配合。

## 6. Concurrency and Consistency

- 不涉及事务、锁、MQ、缓存一致性。
- 样式层为纯函数式映射，无运行时共享状态；文章切换的并发点仍由 `docs.js` 单事件循环收敛。

## 7. Performance Bottleneck Prediction

- 无新增请求与体积开销；圆角、阴影相关绘制开销被移除，长文滚动合成成本略降。
- 表格 `overflow-wrap: anywhere` 会参与 min-content 计算，避免移动端表格溢出；对超长英文标识符代价是必要处折行。

## 8. Risks and Fallback Plan

| Risk | Severity | Fallback | Owner |
| --- | --- | --- | --- |
| 羊皮纸白配色与用户预期不符（用户只提线条与字号） | P2 | 仅需替换 `:root` 令牌值，单点回滚 | dev |
| 字号收缩过度导致可读性下降 | P2 | 字号集中在 `:root` 与各组件声明处，可按 0.02rem 步长回补 | dev |
| 表格单元格 `anywhere` 折行打断长标识符 | P2 | 移动端窄屏的取舍；桌面宽度充足时不触发折行 | dev |
| 浏览器缓存旧样式 | P2 | 资源版本参数更新为 `?v=20260915-docs-line` | dev |

## 9. Monitoring and Alerting

- 无服务端探针；前端错误继续 `console.error`，加载失败以状态块呈现。
- 发布后观察项：文章切换、`?doc=` 深链、移动端是否出现横向滚动。

## 10. Rollout and Rollback

- 发布：随仓库推送至 GitHub Pages，无灰度（纯样式变更、单页面生效）。
- 回滚：`git revert` 本次提交即恢复原样式；或仅回退 `docs.css` + 版本参数两处。

## 11. State Trace

| Time | State | Decision | Rollback count | Notes |
| --- | --- | --- | --- | --- |
| 2026-09-15 | Solution Design | 复用 prompts 令牌与线条化组件，样式层单文件收敛 | 0 | 不改 HTML 结构与 JS |
| 2026-09-15 | Solution Design | 附带修复移动端宽表格横向溢出 | 0 | 通过单元格 `overflow-wrap` 实现 |
