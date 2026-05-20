# Apollo 配置变更触发 HttpClient 连接池关闭问题分析报告

## 1. 问题结论

当前项目存在如下风险链路：

1. Apollo 任意配置发生变更。
2. 公共框架 `msv-foundation` 监听到配置变更后，发布 `EnvironmentChangeEvent`。
3. Spring Cloud Edgware 的 `ConfigurationPropertiesRebinder` 监听该事件，对所有 `@ConfigurationProperties` Bean 执行 `rebind()`。
4. `rebind()` 内部会先执行 `destroyBean(bean)`，再执行 `initializeBean(bean, beanName)`。
5. 项目中的 `httpRequestFactory` 是 `HttpComponentsClientHttpRequestFactory` 类型，且声明为 `@ConfigurationProperties` Bean。
6. `destroyBean(httpRequestFactory)` 会触发 `HttpComponentsClientHttpRequestFactory.destroy()`，关闭底层 `HttpClient` 及连接池。
7. 后续 `initializeBean()` 只是对同一个对象重新初始化和属性绑定，不会重新执行构造器，不会重建底层 `HttpClient`。
8. `loginRestTemplate` 继续持有该 factory，后续发请求时存在出现 `Connection manager is shut down` 的风险。

结论：

- 当前链路判断成立。
- 风险不是只在 `login.rest.connection.*` 配置变更时触发，而是 Apollo 任意配置变更都可能触发。
- 根因不是 Bean 没有重新初始化，而是重新初始化不会重建已被关闭的连接池。

## 2. 场景说明

项目中登录相关 HTTP 调用使用 `RestTemplate + HttpComponentsClientHttpRequestFactory` 实现，请求超时参数通过 `@ConfigurationProperties(prefix = "login.rest.connection")` 动态绑定。

对应代码：

- `src/main/java/com/hupu/passport/config/common/LoginConfig.java`
- `src/main/resources/application.properties`

关键实现如下：

```java
@Bean
@Primary
@ConfigurationProperties(prefix = "login.rest.connection")
public HttpComponentsClientHttpRequestFactory httpRequestFactory() {
    return new HttpComponentsClientHttpRequestFactory();
}

@Bean(name = "loginRestTemplate")
public RestTemplate restTemplate() {
    return new RestTemplate(httpRequestFactory());
}
```

对应配置：

```properties
login.rest.connection.connection-request-timeout=3000
login.rest.connection.connect-timeout=1000
login.rest.connection.read-timeout=3000
```

## 3. 证据链

### 3.1 项目中的目标 Bean 确实属于 `@ConfigurationProperties`

`LoginConfig` 中的 `httpRequestFactory` 使用了 `@ConfigurationProperties(prefix = "login.rest.connection")`，因此会被 Spring Cloud 的 `ConfigurationPropertiesRebinder` 纳入管理。

同时，`loginRestTemplate` 直接持有该 Bean 的引用。

### 3.2 公共框架会将 Apollo 变更桥接为 `EnvironmentChangeEvent`

反编译 `msv-foundation-1.7.7-SNAPSHOT.jar` 中的 `com.hupuarena.msvfoundation.apollo.ApolloPropertiesRefresher` 可见：

- `onChange(ConfigChangeEvent)` 方法上标注了 `@ApolloConfigChangeListener`
- 收到 Apollo 配置变更后，会执行：

```java
applicationContext.publishEvent(new EnvironmentChangeEvent(changeEvent.changedKeys()))
```

这说明 Apollo 配置变更会直接进入 Spring Cloud 的环境变更事件链路。

### 3.3 当前项目依赖链包含 Spring Cloud Edgware 的 rebinder

本项目父依赖 `msv-foundation-parent:1.7.7-SNAPSHOT` 基于：

- Spring Boot `1.5.14.RELEASE`
- Spring Cloud `Edgware.SR4`

该版本包含 `spring-cloud-context`，其中 `ConfigurationPropertiesRebinderAutoConfiguration` 会自动注册 `ConfigurationPropertiesRebinder`。

### 3.4 `ConfigurationPropertiesRebinder` 的实际行为是 destroy + initialize

反编译 `spring-cloud-context-1.3.4.RELEASE.jar` 中的 `org.springframework.cloud.context.properties.ConfigurationPropertiesRebinder` 可见：

```java
Object bean = applicationContext.getBean(beanName);
beanFactory.destroyBean(bean);
beanFactory.initializeBean(bean, beanName);
```

说明其行为不是创建新实例，而是：

1. 对旧实例执行销毁逻辑
2. 对旧实例重新执行初始化逻辑

### 3.5 `HttpComponentsClientHttpRequestFactory.destroy()` 会关闭底层 HttpClient

反编译 `spring-web-4.3.18.RELEASE.jar` 中的 `HttpComponentsClientHttpRequestFactory` 可见：

1. 默认构造器中会创建底层 `HttpClient`

```java
public HttpComponentsClientHttpRequestFactory() {
    this.httpClient = HttpClients.createSystem();
}
```

2. `destroy()` 中会关闭底层 `HttpClient`

```java
public void destroy() throws Exception {
    HttpClient client = getHttpClient();
    if (client instanceof Closeable) {
        ((Closeable) client).close();
    }
}
```

这意味着一旦 rebinder 调用了 `destroyBean(httpRequestFactory)`，底层连接池会被关闭。

### 3.6 `initializeBean()` 不会重建底层 HttpClient

`HttpComponentsClientHttpRequestFactory` 的 `httpClient` 创建发生在构造器中，而不是 `afterPropertiesSet()` 或其他初始化回调中。

`@ConfigurationProperties` 重新绑定时，只会调用：

- `setConnectTimeout`
- `setConnectionRequestTimeout`
- `setReadTimeout`

这些 setter 只更新 `RequestConfig`，不会重新 `new HttpClient`，也不会重建连接池。

因此，`initializeBean()` 之后，对象本身仍存在，但其内部 `httpClient` 已处于关闭状态。

## 4. 最终链路判断

结合项目代码和依赖实现，当前链路可以明确整理为：

```text
Apollo 任意配置变更
    ↓
ApolloPropertiesRefresher.onChange()
    ↓
publishEvent(new EnvironmentChangeEvent(changedKeys))
    ↓
ConfigurationPropertiesRebinder.onApplicationEvent()
    ↓
rebind()
    ↓
遍历所有 @ConfigurationProperties Bean
    ↓
命中 httpRequestFactory
    ↓
destroyBean(httpRequestFactory)
    ↓
HttpComponentsClientHttpRequestFactory.destroy()
    ↓
CloseableHttpClient.close()
    ↓
连接池关闭
    ↓
initializeBean(httpRequestFactory, beanName)
    ↓
仅重新初始化同一个对象并重新绑定 timeout 属性
    ↓
不会重建底层 HttpClient/连接池
    ↓
loginRestTemplate 后续继续使用旧 factory
    ↓
可能出现 Connection manager is shut down
```

结论：该链路成立。

## 5. 影响范围评估

### 5.1 直接影响

- `loginRestTemplate` 后续请求失败。
- 依赖该 `RestTemplate` 的登录、支付余额等调用链路受影响。
- 失败表现可能为：
  - `Connection manager is shut down`
  - 下游 HTTP 调用直接异常
  - Hystrix fallback 增加

### 5.2 扩展影响

项目中其他 `@ConfigurationProperties` Bean 也会进入同一条 rebind 链路，应排查：

- Redis 连接配置类
- 其他 HTTP 客户端工厂类
- 带连接池、线程池、网络资源的配置型 Bean

如果这些 Bean 的 `destroy()` 具有关闭资源行为，而 `initializeBean()` 又不会重建底层资源，则存在同类风险。

## 6. 线上特征

若线上存在该问题，常见现象包括：

- Apollo 发布任意配置后，部分 HTTP 调用突然连续报错。
- 应用未重启，但下游调用失败率明显升高。
- 日志中出现 `Connection manager is shut down`。
- 同一时间点可能伴随 Apollo 配置变更日志和 `ApolloPropertiesRefresher` 刷新日志。

## 7. 风险等级

- 风险等级：`P1`
- 原因：
  - 触发条件低，Apollo 任意配置变更即可触发。
  - 影响链路可能落在登录、支付相关主流程。
  - 出现后会直接导致下游 HTTP 不可用。

## 8. 修复建议

### 8.1 短期止血

优先避免将 `HttpComponentsClientHttpRequestFactory` 直接声明为 `@ConfigurationProperties` Bean。

建议改为两段式：

1. 使用独立的属性对象承载 timeout 参数。
2. `HttpComponentsClientHttpRequestFactory` 在启动时基于属性对象创建，不参与 rebinder 的 destroy/reinitialize。

示意方案：

```java
@ConfigurationProperties(prefix = "login.rest.connection")
public class LoginRestConnectionProperties {
    private int connectTimeout;
    private int connectionRequestTimeout;
    private int readTimeout;
}
```

然后在配置类中显式 new factory，并只在启动阶段装配。

### 8.2 中期治理

对所有 `@ConfigurationProperties` Bean 做一次排查，重点识别以下对象：

- 持有连接池
- 持有线程池
- 持有网络连接
- 实现 `DisposableBean`
- `destroyMethod` 会释放底层资源

这类 Bean 不建议直接作为 `@ConfigurationProperties` 绑定对象。

### 8.3 框架层治理

如果公共框架必须支持动态刷新，建议在框架层增加保护：

- 对高风险 Bean 类型做黑名单，不进入 rebinder。
- 或将 refresh 策略改为“重建新实例并原子替换引用”，而不是“destroy + initialize 同一个旧实例”。
- 或仅刷新纯属性对象，不直接刷新资源型 Bean。

## 9. 建议的汇报口径

可以按以下方式对外说明：

1. 当前问题已定位到 Apollo 配置刷新与 Spring Cloud `ConfigurationPropertiesRebinder` 的交互链路。
2. 项目中 `HttpComponentsClientHttpRequestFactory` 被定义为 `@ConfigurationProperties` Bean。
3. 配置刷新时，该 Bean 会被先销毁再初始化，销毁动作会关闭底层 HttpClient 连接池。
4. 后续初始化不会重建连接池，因此 `RestTemplate` 继续使用旧 factory 时会出现连接池已关闭异常。
5. 该问题并非单个配置项专属，而是 Apollo 任意配置变更都可能触发。
6. 建议尽快将资源型 Bean 与动态配置绑定解耦，避免主链路受影响。

## 10. 本次分析范围

本报告结论基于以下对象的本地代码和依赖反编译结果：

- 项目源码 `LoginConfig`
- 公共框架 `msv-foundation-1.7.7-SNAPSHOT`
- Spring Cloud `spring-cloud-context-1.3.4.RELEASE`
- Spring Web `spring-web-4.3.18.RELEASE`

本次未在运行态进程中做压测验证，但静态证据链已足够支撑问题定性。
