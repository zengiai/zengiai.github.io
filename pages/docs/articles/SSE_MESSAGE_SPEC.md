# UserChat SSE 消息块规范

> 文档版本: 1.0.0
> 更新日期: 2026-03-17
> 作者: zengjiaqi

---

## 1. 概述

本文档定义了 `UserChat` 接口通过 SSE (Server-Sent Events) 流式返回的消息块格式规范。前端通过 EventSource 接收各类事件，根据 `event_type` 区分消息类型并进行相应处理。

## 2. 基础消息格式

所有 SSE 消息遵循以下基础结构：

```json
{
  "event_type": "<事件类型>",
  "data": { /* 具体数据内容 */ }
}
```

### EventSource 事件名

| 事件名 (event.name) | 对应枚举 | 说明 |
|---------------------|----------|------|
| `delta` | `SseEventTypeEnums.delta` | AI 回复内容增量 |
| `message` | `SseEventTypeEnums.message` | 会话状态消息 |
| `thought` | `SseEventTypeEnums.thought` | 思考过程内容 |
| `upsell` | `SseEventTypeEnums.upsell` | 满减推荐卡片 |
| `order_failure` | `SseEventTypeEnums.order_failure` | 订单失败卡片 |
| `abandon_checkout` | `SseEventTypeEnums.abandon_checkout` | 弃单挽回卡片 |
| `reply_status` | `SseEventTypeEnums.reply_status` | 回复状态标识 |

---

## 3. 消息类型详解

### 3.1 delta - AI 回复内容增量

**触发时机**: AI 流式返回回复内容时逐块发送

**数据结构**:
```json
{
  "event_type": "delta",
  "data": {
    "messageId": 123456789,
    "value": "这是一段AI回复的内容块..."
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `messageId` | Long | AI 消息记录 ID |
| `value` | String | 回复内容文本片段 |

**前端处理建议**:
- 将 `value` 追加到当前消息缓冲区
- 实时渲染到对话界面

---

### 3.2 message - 会话状态消息

**触发时机**: 会话开始、进行中、结束时发送

**数据结构**:

#### 会话开始
```json
{
  "event_type": "message",
  "data": {
    "statusCode": 1,
    "statusMsg": "处理中",
    "data": {
      // 各场景特定的初始化数据
    }
  }
}
```

#### 会话结束
```json
{
  "event_type": "message",
  "data": {
    "statusCode": 2,
    "statusMsg": "结束"
  }
}
```

**状态码定义** (`SseStatusEnums`):

| statusCode | statusMsg | 说明 |
|------------|-----------|------|
| 1 | 处理中 | 流式传输进行中 |
| 2 | 结束 | 正常结束 |
| 3 | 超时 | 连接超时 |
| 4 | 错误 | 发生异常错误 |

---

### 3.3 thought - 思考过程内容

**触发时机**: AI 思考阶段输出（需开启思考模式 `needThink=true`）

**数据结构**:
```json
{
  "event_type": "thought",
  "data": {
    "title": "查询订单状态",
    "content": "正在分析用户意图...",
    "references": [
      {
        "id": "doc_001",
        "title": "订单查询文档",
        "url": "https://..."
      }
    ],
    "tipArea": {
      "type": "order_query",
      "tipContent": "相关订单信息",
      "tipJumpUrl": null,
      "tipJumpButtonText": "查看详情"
    }
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | String | 思考阶段标题 |
| `content` | String | 思考内容描述 |
| `references` | Array | RAG 引用参考文档列表 |
| `tipArea` | Object | 提示区域配置 |

**TipArea 结构**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | String | 提示类型标识 |
| `tipContent` | String | 提示文本内容 |
| `tipJumpUrl` | String | 跳转链接（可选） |
| `tipJumpButtonText` | String | 按钮文案 |

---

### 3.4 reply_status - 回复状态

**触发时机**: 用户消息发送后，告知前端是否会有 AI 回复

**数据结构**:

#### 有 AI 回复
```json
{
  "event_type": "reply_status",
  "data": {
    "hasReply": true,
    "replyType": null,
    "estimatedTime": null
  }
}
```

#### 无 AI 回复（如转人工、AI 关闭等场景）
```json
{
  "event_type": "reply_status",
  "data": {
    "hasReply": false,
    "replyType": null,
    "estimatedTime": null
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `hasReply` | Boolean | 是否有后续回复 |
| `replyType` | String | 回复类型（预留扩展） |
| `estimatedTime` | Long | 预计回复时间毫秒数（预留扩展） |

**前端处理建议**:
- 当 `hasReply=false` 时，可立即隐藏加载状态，无需等待后续消息
- 未来可扩展 `replyType` 支持延迟回复、排队等待等场景

---

### 3.5 upsell - 满减推荐卡片

**触发时机**: 检测到满减营销机会时

**数据结构**:
```json
{
  "event_type": "upsell",
  "data": {
    "type": "add_on_recommendation_result",
    "products": [
      {
        "productId": "P001",
        "name": "推荐商品",
        "price": 99.99,
        "imageUrl": "https://..."
      }
    ],
    "discountInfo": {
      "threshold": 200,
      "discount": 20
    }
  }
}
```

---

### 3.6 order_failure - 订单失败卡片

**触发时机**: 检测到订单失败场景时

**数据结构**:
```json
{
  "event_type": "order_failure",
  "data": {
    "type": "order_failure_card_info",
    "orderId": "ORDER_001",
    "failureReason": "库存不足",
    "suggestedActions": ["更换商品", "联系客服"]
  }
}
```

---

### 3.7 abandon_checkout - 弃单挽回卡片

**触发时机**: 检测到用户弃单场景时

**数据结构**:
```json
{
  "event_type": "abandon_checkout",
  "data": {
    "type": "abandon_checkout_card_info",
    "cartItems": [
      {
        "productId": "P001",
        "name": "购物车商品",
        "price": 199.99
      }
    ],
    "incentive": {
      "type": "coupon",
      "value": "10% OFF"
    }
  }
}
```

---

## 4. 完整会话流程示例

```
[Client] 发送用户消息
    ↓
[Server] event: message (statusCode=1, 会话开始)
    ↓
[Server] event: reply_status (hasReply=true, 告知有回复)
    ↓
[Server] event: thought (思考过程，可选)
    ↓
[Server] event: delta (内容块 1)
[Server] event: delta (内容块 2)
[Server] event: delta (内容块 3)
    ↓
[Server] event: upsell (推荐卡片，可选)
    ↓
[Server] event: message (statusCode=2, 会话结束)
    ↓
[Connection] 连接关闭
```

---

## 5. 前端集成示例

```javascript
const eventSource = new EventSource('/api/v1/chat/userChat');

eventSource.addEventListener('delta', (e) => {
  const data = JSON.parse(e.data);
  appendMessage(data.value);
});

eventSource.addEventListener('message', (e) => {
  const data = JSON.parse(e.data);
  if (data.statusCode === 2) {
    // 会话结束
    eventSource.close();
  }
});

eventSource.addEventListener('reply_status', (e) => {
  const data = JSON.parse(e.data);
  if (!data.hasReply) {
    // 无 AI 回复，可停止加载动画
    hideLoading();
  }
});

eventSource.addEventListener('error', (e) => {
  console.error('SSE 连接异常', e);
  eventSource.close();
});
```

---

## 6. 注意事项

1. **消息顺序**: 服务端保证同一类型的消息按产生顺序发送，但不同类型消息之间无严格顺序保证
2. **幂等处理**: 前端应做好重复消息的去重处理（如通过 messageId）
3. **连接管理**: 收到 `statusCode=2` 或连接异常时应及时关闭 EventSource
4. **超时处理**: 建议设置合理的超时时间（默认 180 秒）

---

## 7. 版本历史

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| 1.0.0 | 2026-03-17 | 初始版本，新增 `reply_status` 事件类型 |
