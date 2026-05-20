# 主路径失败自动降级模式使用说明

## 1. 模式定位

这个模式解决的是：

- 主查询路径依赖三方能力
- 主查询路径在部分商户、部分权限、部分市场下可能失败
- 失败后不希望整个请求直接 500
- 系统允许返回“能力降级后的结果”

本次在商品市场查询里，主路径是“带市场查询”，降级路径是“不带市场查询”。

一句话总结：

先走最优结果路径，失败后自动回退到兼容路径，优先保证主链路可用。

## 2. 适用场景

适合：

- 三方 API 权限不稳定
- 多租户下能力差异明显
- 查询增强能力可选，不是强一致必需
- 返回基础结果比直接失败更有业务价值
- 读链路降级

不适合：

- 写链路
- 扣库存、下单、支付、退款这类强一致链路
- 降级后会产生错误业务语义的场景
- 必须区分“无数据”和“权限失败”的场景

结论：

这个模式优先用于“增强型读接口”，不要直接套到核心交易写链路。

## 3. 模式结构

本次实现拆成三层：

1. 执行器接口：定义“如何执行一次查询”
2. 降级模板：统一处理“先主路径、失败再回退”
3. 结果包装：记录本次最终实际使用的上下文

对应代码位置：

- 执行器接口：[ShopifyApiService.java](/Users/zengjiaqi/Desktop/gitlab/aura-shopifymcp-msv/src/main/java/com/hupu/service/ShopifyApiService.java#L95)
- 降级模板：[ShopifyApiService.java](/Users/zengjiaqi/Desktop/gitlab/aura-shopifymcp-msv/src/main/java/com/hupu/service/ShopifyApiService.java#L103)
- 结果包装：[ShopifyApiService.java](/Users/zengjiaqi/Desktop/gitlab/aura-shopifymcp-msv/src/main/java/com/hupu/service/ShopifyApiService.java#L124)

## 4. 核心思想

### 4.1 主路径和降级路径分离

不要在每个业务方法里手写：

```java
try {
    // 带市场查询
} catch (Exception e) {
    // 不带市场查询
}
```

这种写法的问题是：

- 每个方法都重复一遍
- 日志格式不统一
- 容易漏改
- 后续加监控困难

所以更好的做法是抽成统一模板方法。

### 4.2 业务方法只负责“怎么查”

业务方法只把自己的查询逻辑写成 lambda 传给模板方法。

模板方法只负责：

- 判断是否真的需要走主路径
- 捕获异常
- 记录降级日志
- 自动执行回退路径
- 返回最终实际生效的上下文

这就是典型的“模板方法 + 函数式策略”的组合用法。

## 5. 通用代码模板

### 5.1 执行器接口

```java
@FunctionalInterface
private interface FallbackExecutor<T> {
    T execute(String context) throws IOException;
}
```

说明：

- `T` 是查询结果类型
- `context` 是主路径上下文，例如 `marketRegion`
- 如果降级，就传 `null`

### 5.2 返回结果包装

```java
private static final class FallbackResult<T> {
    private final T data;
    private final String effectiveContext;

    private FallbackResult(T data, String effectiveContext) {
        this.data = data;
        this.effectiveContext = effectiveContext;
    }

    public T getData() {
        return data;
    }

    public String getEffectiveContext() {
        return effectiveContext;
    }
}
```

说明：

- `data` 是最终结果
- `effectiveContext` 是最终真正生效的上下文
- 如果发生降级，这里通常是 `null`

### 5.3 模板方法

```java
private <T> FallbackResult<T> executeWithFallback(String context,
                                                  String operation,
                                                  FallbackExecutor<T> executor) throws IOException {
    if (StringUtils.isBlank(context)) {
        return new FallbackResult<>(executor.execute(null), null);
    }

    try {
        return new FallbackResult<>(executor.execute(context), context);
    } catch (IOException | RuntimeException primaryException) {
        log.warn("主路径失败，开始降级 - operation: {}, context: {}", operation, context, primaryException);
        try {
            return new FallbackResult<>(executor.execute(null), null);
        } catch (IOException | RuntimeException fallbackException) {
            fallbackException.addSuppressed(primaryException);
            throw fallbackException;
        }
    }
}
```

## 6. 在业务代码里的使用方式

### 6.1 查询商品列表

```java
FallbackResult<List<JSONObject>> queryResult = executeWithFallback(
        marketRegion,
        "getProductsWithVariantsApi",
        effectiveMarketRegion -> {
            boolean withMarketContext = StringUtils.isNotBlank(effectiveMarketRegion);
            String query = withMarketContext
                    ? QueryGql.Query_products_search_with_market
                    : QueryGql.Query_products_search;

            Map<String, Object> variables = new HashMap<>();
            variables.put("query", searchQuery);
            if (withMarketContext) {
                variables.put("country", effectiveMarketRegion);
            }
            return doGraphQlQuery(query, variables);
        }
);
```

使用要点：

- lambda 内同时兼容“有上下文”和“无上下文”两条分支
- 不能把“带市场 query”写死
- 不能把 `country` 参数无脑塞进去

### 6.2 后置流程必须使用实际生效上下文

```java
trans2MarketPrice(queryResult.getEffectiveContext(), dtoList, shopDomain, storeFrontToken);
```

这是这个模式里最容易漏的一点。

如果前面的主查询已经降级成功，这里还继续使用原始 `marketRegion`，就会出现：

- 主查询已经回退成功
- 后置价格覆盖又重新走带市场
- 再次触发 500

所以后置逻辑必须使用 `effectiveContext`，不能再用原始入参。

## 7. 本仓库中的实际落点

本次已经接入该模式的方法包括：

- 商品详情按 ID 查询：[ShopifyApiService.java](/Users/zengjiaqi/Desktop/gitlab/aura-shopifymcp-msv/src/main/java/com/hupu/service/ShopifyApiService.java#L215)
- 商品列表查询：[ShopifyApiService.java](/Users/zengjiaqi/Desktop/gitlab/aura-shopifymcp-msv/src/main/java/com/hupu/service/ShopifyApiService.java#L890)
- handle 列表查询：[ShopifyApiService.java](/Users/zengjiaqi/Desktop/gitlab/aura-shopifymcp-msv/src/main/java/com/hupu/service/ShopifyApiService.java#L1064)
- productId 批量查询：[ShopifyApiService.java](/Users/zengjiaqi/Desktop/gitlab/aura-shopifymcp-msv/src/main/java/com/hupu/service/ShopifyApiService.java#L1298)
- 全量商品原始查询：[ShopifyApiService.java](/Users/zengjiaqi/Desktop/gitlab/aura-shopifymcp-msv/src/main/java/com/hupu/service/ShopifyApiService.java#L2060)
- storefront 商品价格查询：[ShopifyApiService.java](/Users/zengjiaqi/Desktop/gitlab/aura-shopifymcp-msv/src/main/java/com/hupu/service/ShopifyApiService.java#L2653)
- storefront 变体价格查询：[ShopifyApiService.java](/Users/zengjiaqi/Desktop/gitlab/aura-shopifymcp-msv/src/main/java/com/hupu/service/ShopifyApiService.java#L2754)
- 市场价格区间查询：[ShopifyApiService.java](/Users/zengjiaqi/Desktop/gitlab/aura-shopifymcp-msv/src/main/java/com/hupu/service/ShopifyApiService.java#L2897)
- storefront 商品市场查询：[ShopifyApiService.java](/Users/zengjiaqi/Desktop/gitlab/aura-shopifymcp-msv/src/main/java/com/hupu/service/ShopifyApiService.java#L3565)

## 8. 设计收益

### 8.1 稳定性收益

- 避免三方局部权限问题直接打崩接口
- 优先返回基础结果
- 保住主链路可用性

### 8.2 工程收益

- 降级逻辑统一
- 日志统一
- 接入成本低
- 后续做监控埋点更方便

### 8.3 扩展收益

后面如果想从“无市场查询”继续扩成多级降级，也容易演进，比如：

1. 带市场查询
2. 不带市场查询
3. 读缓存
4. 返回兜底空结果

## 9. 风险与边界

### 9.1 不要滥用到写链路

这个模式适合“读降级”，不适合“写补偿”。

错误示例：

- 扣库存失败后自动降级成不校验库存
- 支付校验失败后自动返回成功

这种会直接破坏业务正确性。

### 9.2 当前实现按异常统一降级

现在代码里是：

- `IOException`
- `RuntimeException`

只要主路径抛这两类异常，就会进入降级。

优点是简单直接，稳定性优先。

代价是：

- 不区分权限错误
- 不区分参数错误
- 不区分三方临时故障

如果后面要更精细，可以做成：

- 仅对 403 / 500 / 权限关键字降级
- 参数错误直接抛出

### 9.3 降级成功不代表功能完整

降级后的结果一般是“基础可用”，但可能丢失：

- 市场价格
- 市场可售状态
- 市场专属字段

所以对调用方要有明确预期：

降级的目标是可用，不是完全等价。

### 9.4 日志必须保留

降级不能静默发生。

至少要记录：

- 操作名
- 上下文值
- 异常堆栈

否则线上只能看到“接口成功了”，但你不知道已经偷偷降级了多少次。

## 10. 推荐监控方案

建议后续补三类监控：

### 10.1 降级次数

- 指标名：`fallback_total`
- 维度：`operation`、`marketRegion`

### 10.2 降级成功率

- 主路径失败后，回退路径是否成功

### 10.3 高频商户

- 哪些 merchant 经常触发降级
- 是否集中在某些市场

如果后面要做治理，这三项最有价值。

## 11. 推荐落地规则

以后在别的场景复用时，建议按下面规则判断：

### 可以用

- 外部能力增强型查询
- 个性化查询
- 市场化/区域化/多租户差异查询
- 可返回基础结果的场景

### 谨慎用

- 对返回精度要求很高的分析接口
- 调用方需要明确知道“为什么降级”的接口

### 禁止用

- 交易写链路
- 资金链路
- 状态变更链路
- 幂等语义严格依赖主路径执行结果的接口

## 12. 一个更通用的命名建议

如果你准备把这个模式推广到更多模块，建议不要继续叫 `MarketQuery`，而是抽成更通用的命名：

```java
FallbackExecutor<T>
FallbackResult<T>
executeWithFallback(...)
```

如果要强调“主路径 + 降级路径”，也可以叫：

```java
PrimaryFallbackExecutor<T>
PrimaryFallbackResult<T>
executeWithPrimaryFallback(...)
```

这样以后用于：

- 店铺能力降级
- 风控服务降级
- 营销引擎降级
- 汇率服务降级

都不会显得语义别扭。

## 13. 最后总结

这个模式本质上不是“异常处理技巧”，而是一个稳定性设计动作：

- 主路径提供更优能力
- 降级路径提供基础可用能力
- 模板方法统一处理失败切换
- 结果对象向下游传递真实生效上下文

在高并发电商系统里，这类模式非常适合挂在“三方增强型读能力”上。

核心原则只有一句：

读链路可降级，写链路不乱降级。
