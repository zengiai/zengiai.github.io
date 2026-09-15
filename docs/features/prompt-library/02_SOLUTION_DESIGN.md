# Solution Design

## Feature

- Feature slug: `prompt-library`
- Owner role: `solution-architect`
- Current state: `Solution Design`
- Previous state: `Requirement Analysis`
- Next state: `Gate Review`

## 1. Scenario Analysis

- 场景：个人站点的公开提示词分享页，访问者浏览提示词全文并复制使用。
- 影响路径：仅新增 `pages/prompts/` 目录，不触碰站点任何既有页面、构建配置或部署链路。
- 用户角色：站点访客（只读）；内容维护者（直接编辑 `prompts.json`）。

## 2. Traffic Model Assumptions

- Peak QPS: 个人站点量级，可忽略。
- RT 99 target: 首屏 < 1s（GitHub Pages + 一次同源 JSON fetch）。
- Data volume: `prompts.json` 预计 < 100 条、单文件 < 200KB。
- Hotspot risk: 无。
- External dependency assumptions: 仅 Google Fonts（可降级为本地字体栈）；GitHub Pages 静态托管。

## 3. Architecture Design

- 三层文件结构，零构建、零运行时依赖：

```text
pages/prompts/
|-- index.html          # 结构骨架 + 状态占位
|-- prompts.json        # 数据源（title/category/content/metadata）
`-- assets/
    |-- prompts.css     # 羊皮纸白主题、双栏/单栏响应式
    `-- prompts.js      # 数据加载、列表渲染、切换、一键复制
```

- 运行时流程：DOMContentLoaded（`defer`）→ fetch `prompts.json` → 渲染侧边栏分组 → 解析 `?p=` 选中目标 → 渲染内容区 → 绑定复制/点击/popstate。
- 依赖方向：`index.html` 只依赖同目录资源与 Google Fonts；不与其他页面双向引用（独立页面约束）。
- 实现模式与站点既有 `pages/docs/assets/docs.js` 保持一致（IIFE、`escapeHtml`、fetch + `cache: "no-cache"`、`?param` 深链接、`state-message` 状态块）。
- 视觉语言（第二轮）：内容分割仅使用线条（顶线、左侧竖线、底线、active 下划线），不使用卡片、方框与阴影；正文去除背景纸卡，列表项与标签去框化。
- 字体规范（第二轮）：`--font-main = "Times New Roman", Times, "PingFang SC", ...`（英文/数字 Times New Roman，中文回退苹方）；`--font-code = "Google Sans Code", ...` 用于代码类文本；页面移除 Noto Serif SC 字体依赖。
- 正文渲染（第二轮）：`renderContent` 按行扫描 `content`，将 ``` 围栏块渲染为等宽代码段（附左竖线，保留围栏标记），其余为正文段；渲染文本与 `content` 原文逐字一致，复制不受渲染影响。
- 正文渲染（第三轮）：`renderContent` 升级为 `renderMarkdown` 行级解析器，支持标题（`#` 映射为 h2-h6 保持层级）、引用（递归渲染）、有序 / 无序列表与任务项、围栏代码块（`pre.prompt-code` 附 `data-lang`）、分隔线、表格与段落；行内支持加粗 / 斜体 / 行内代码 / 链接 / 删除线。所有文本先 `escapeHtml` 再行内转换，行内代码独立转义；链接过滤 `javascript:` / `data:` / `vbscript:` 协议。
- 复制解耦（第三轮）：一键复制始终复制 `prompts.json` 的 `content` 源文（Markdown 原文），渲染仅作用于展示层。
- 字体规范（第三轮）：`--font-main = -apple-system, BlinkMacSystemFont, system-ui, "SF Pro Text", "PingFang SC", ...`（英文 / 数字使用 Apple 系统字体 SF Pro，中文苹方）；`--font-code` 仍为 Google Sans Code；已移除 Times New Roman 衬线栈。

## 4. Data Model Design

`prompts.json`（无数据库）：

```json
{
  "updated": "2026-09-15",
  "prompts": [
    {
      "slug": "string（URL 安全，唯一）",
      "title": "string（侧边栏与内容区标题）",
      "category": "string（分组维度）",
      "summary": "string（内容区摘要）",
      "tags": ["string（标签 chips）"],
      "updated": "YYYY-MM-DD（条目更新时间）",
      "content": "string（提示词全文，\\n 换行，按原文展示与复制）"
    }
  ]
}
```

- 默认值：`prompts` 为空数组，页面渲染空状态。
- 兼容：JS 同时兼容顶层为纯数组的旧格式（`Array.isArray` 分支）。

## 5. Interface and Module Boundaries

| Module | Responsibility | Upstream | Downstream | Notes |
| --- | --- | --- | --- | --- |
| `index.html` | 结构、无障碍属性、状态占位 | 无 | prompts.css / prompts.js | 无顶部导航 |
| `prompts.js` | 取数、渲染、切换、复制、深链接 | `prompts.json` | DOM | IIFE，无全局变量 |
| `prompts.css` | 主题与响应式 | 无 | 字体链接 | 设计变量集中于 `:root` |
| `prompts.json` | 内容数据 | 维护者 | prompts.js | 静态托管同源 fetch |

## 6. Concurrency and Consistency

- 不涉及事务、锁、MQ、缓存一致性。
- 前端并发点：重复点击复制 → 统一由 `copyResetTimer` 重置按钮状态；`?p=` 与 popstate 由 `history` 保证一致性。
- 复制实现：`navigator.clipboard.writeText`（secure context）优先，降级 `textarea + execCommand("copy")`。

## 7. Performance Bottleneck Prediction

- 唯一远端开销为字体请求与一次 JSON fetch，均可忽略；无框架体积。
- 长内容渲染为单节点 `pre-wrap` 文本，无高频重排风险。

## 8. Risks and Fallback Plan

| Risk | Severity | Fallback | Owner |
| --- | --- | --- | --- |
| 非 HTTPS / 非 localhost 打开时 Clipboard API 不可用 | P2 | execCommand 降级；仍失败提示手动复制 | dev |
| 用户直接 `file://` 打开导致 fetch 被浏览器拦截 | P2 | 错误状态明确提示“请通过 HTTP 服务访问” | dev |
| `?p=` 失效链接 | P2 | 回退展示首条，页面不白屏 | dev |
| 字体 CDN 不可达 | P2 | 本地衬线字体栈（Songti SC / Georgia 等）兜底 | dev |

## 9. Monitoring and Alerting

- 无服务端探针；前端错误统一 `console.error`，页面用可见状态块替代静默失败。

## 10. Rollout and Rollback

- 发布：随仓库推送至 GitHub Pages 默认分支，无灰度需求（纯新增路径）。
- 回滚：删除 `pages/prompts/` 目录提交即完全回滚；不影响其他页面。

## 11. State Trace

| Time | State | Decision | Rollback count | Notes |
| --- | --- | --- | --- | --- |
| 2026-09-15 | Solution Design | 复用 docs 页面既有实现模式，零依赖落地 | 0 | 用户约束“独立页面 / 默认空数据”已体现在设计中 |
| 2026-09-15 | Solution Design | 第三轮：新增 Markdown 渲染器与 Apple 字体栈设计 | 0 | 复制与渲染解耦，渲染仅影响展示层 |
