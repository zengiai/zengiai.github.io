# AGENTS.md

## 项目约束

- `aura_tool.html` 是 Aura 工具主入口，功能变更优先保持页面内可直接操作。
- `aura_tool/GUIDE.md` 是 Aura 工具唯一操作指南来源，凡是 `aura_tool` 页面功能、字段、接口、交互、导出能力发生变化，必须同步更新该文档。
- `aura_tool/js/main.js` 中的 `GUIDE_VERSION` 与 `GUIDE_UPDATE_HIGHLIGHTS` 必须随功能迭代同步更新，用于驱动页面内“只弹一次”的更新公告。
- `aura_tool.html` 中 `aura_tool/css/style.css?v=...` 与 `aura_tool/js/main.js?v=...` 的版本参数必须和 `GUIDE_VERSION` 同步更新，用于降低浏览器缓存导致的旧资源命中概率。
- 如果新增功能会影响已有用户操作路径，默认需要补充到指南中的“功能说明”“常见注意事项”或“更新记录”。
- 更新公告必须保持一次性展示：同一浏览器对同一 `GUIDE_VERSION` 只能提示一次。
