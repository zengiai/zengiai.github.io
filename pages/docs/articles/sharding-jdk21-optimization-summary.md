# 分表优化总结

## 1. 背景

项目在升级到 JDK 21 之后，分表相关链路暴露出两类典型问题：

- ShardingSphere 规则虽然存在，但请求没有稳定命中真实分表。
- 原有 `INLINE` / Groovy 行表达式在新运行时环境下存在兼容性和可观测性风险。

本次治理分成两次优化：

1. `bbs-topicnew-msv-web` 的 `oldtopic follow` 分表优化
2. `bbs-topicnew-msv-job` 的 `sharingjdbc` 分表优化

核心目标是：

- 保证 JDK 21 下分表规则稳定生效
- 避免 Mapper 被错误 `SqlSessionFactory` 绑定
- 保持业务扫描边界和原执行路径尽量一致
- 提升问题排查时的可观测性

---

## 2. 第一次优化：`msv-web` 的 `hc_user_topic` 分表治理

### 2.1 影响范围

- 应用入口：`bbs-topicnew-msv-web`
- 分片逻辑表：`hc_user_topic`
- 分表规则：按 `puid % 100` 路由到 `hc_user_topic_0 ~ hc_user_topic_99`

相关文件：

- `bbs-topicnew-msv-web/src/main/java/com/hupu/bbstopicnewmsv/oldtopic/BbsTopicNewMsvApplication.java`
- `bbs-topicnew-msv-web/src/main/java/com/hupu/bbstopicnewmsv/oldtopic/web/datasource/ShardingRuleSource.java`
- `bbs-topicnew-msv-web/src/main/java/com/hupu/bbstopicnewmsv/oldtopic/web/datasource/ShardingMainConf.java`
- `bbs-topicnew-msv-web/src/main/java/com/hupu/bbstopicnewmsv/oldtopic/web/datasource/SingleKeyModuloTableShardingAlgorithm.java`

### 2.2 原问题

升级前后对比看，`web` 侧的主要风险点有 3 个：

1. `FollowMapper` 存在被非分片 `SqlSessionFactory` 抢先绑定的风险。
2. 分片规则依赖 `INLINE` / Groovy 表达式，JDK 21 下兼容性较脆弱。
3. 分片数据源创建和 MyBatis 装配链不够显式，出问题时可观测性差。

### 2.3 处理方案

#### 2.3.1 收敛应用扫描边界

`msv-web` 当前入口保留：

- `@EnableHupuMsv`
- `@EnableAutoConfiguration(exclude = DataSourceAutoConfiguration.class)`
- `@EnableTransactionManagement`
- `@ComponentScan(basePackages = {"com.hupu.bbs", "com.hupu.bbstopicnewmsv.oldtopic"})`
- `@MapperScan(value = {"com.hupu.bbstopicnewmsv.newtopic.mapper"})`

设计意图：

- `oldtopic` 业务 Bean 继续按原语义交给 Spring 扫描。
- `newtopic` mapper 仍由全局 `@MapperScan` 接管。
- `follow` 分片链路由独立数据源配置控制，不再依赖隐式装配。

#### 2.3.2 分片规则从表达式切换为类算法

`ShardingRuleSource` 现改为显式 `@Configuration + @Bean`，并采用：

- `CLASS_BASED` 分片算法
- `<LITERAL>` 形式的真实节点列表

当前 `hc_user_topic` 实际节点由固定字面量生成：

- `follow.hc_user_topic_0`
- `follow.hc_user_topic_1`
- ...
- `follow.hc_user_topic_99`

这样做的价值：

- 避免 `INLINE` / Groovy 表达式解析不稳定
- 节点配置可读，可直接和真实物理表对照
- 启动失败会直接暴露，不再静默失效

#### 2.3.3 强化装配与事务边界

`ShardingMainConf` 改为显式使用分片数据源 Bean，事务边界明确绑定到分片数据源。

设计效果：

- `FollowMapper` 更容易稳定绑定到分片链路
- 启动和运行时排查成本更低

#### 2.3.4 增加算法侧保护

`SingleKeyModuloTableShardingAlgorithm` 增加了更严格的目标表校验和更明确的路由逻辑，避免路由到不存在的子表时静默失败。

### 2.4 优化后效果

- `hc_user_topic` 分表路由不再依赖 Groovy 表达式
- 启动时可直接确认分片数据源初始化
- SQL 可通过 `shardingRuleSourceSqlShow=true` 观察实际落表
- 当节点配置错误时，能够更快暴露而不是“看起来没问题”

### 2.5 推荐验证方式

1. 启动日志确认出现 `hc_user_topic 分片数据源初始化完成`
2. 打开 `shardingRuleSourceSqlShow=true`
3. 使用真实业务接口发起 `puid` 相关读写请求
4. 根据 `puid % 100` 计算目标表，确认实际落在对应 `hc_user_topic_xx`

---

## 3. 第二次优化：`topic-job` 的 `sharingjdbc` 分库分表治理

### 3.1 影响范围

- 应用入口：`bbs-topicnew-msv-job`
- 分片逻辑表：
  - `hc_user_threads`
  - `hc_threads`
  - `hc_tmsgs`
- 分片特征：
  - `hc_user_threads`：按 `puid` 分表
  - `hc_threads`：按 `tid` 分表
  - `hc_tmsgs`：按 `tid` 分库分表

相关文件：

- `bbs-topicnew-msv-job/src/main/java/com/hupu/bbstopicnewmsv/newtopic/BbsTopicNewJobApplication.java`
- `bbs-topicnew-msv-job/src/main/java/com/hupu/bbstopicnewmsv/newtopic/config/sharingjdbc/ShardingRuleSource.java`
- `bbs-topicnew-msv-job/src/main/java/com/hupu/bbstopicnewmsv/newtopic/config/sharingjdbc/SharingJdbcMapperConfig.java`
- `bbs-topicnew-msv-job/src/main/java/com/hupu/bbstopicnewmsv/newtopic/config/sharingjdbc/SingleKeyModuloTableShardingAlgorithm.java`
- `bbs-topicnew-msv-job/src/main/java/com/hupu/bbstopicnewmsv/newtopic/config/sharingjdbc/SingleKeyModuloDatabaseShardingAlgorithm.java`

### 3.2 原问题

`job` 侧问题比 `web` 更复杂，主要有 4 类：

1. 全局 `@MapperScan` 容易把 `sharingjdbc` mapper 抢先绑定到错误工厂。
2. `INLINE` / Groovy 行表达式在 JDK 21 下同样存在兼容性风险。
3. 早期为解决 Bean 冲突曾尝试扩大组件扫描，这会改变原包扫描和执行路径。
4. `sit` 环境日志配置错误，导致即使打开 `sqlShow` 也未必看得到实际 SQL。

### 3.3 处理方案

#### 3.3.1 恢复入口扫描语义，避免业务链路漂移

`BbsTopicNewJobApplication` 最终收敛为：

- 保留 `@EnableHupuMsv`
- 保留 `@SpringBootApplication(exclude = DataSourceAutoConfiguration.class, scanBasePackages = {"com.hupu.bbs"})`
- 全局 `@MapperScan` 仅扫描：
  - `com.hupu.bbstopicnewmsv.newtopic.mapper.topic`
  - `com.hupu.bbstopicnewmsv.newtopic.mapper.bbsapp`
  - `com.hupu.bbstopicnewmsv.oldtopic.mapper`

这样做的原因：

- 不再扩大 `ComponentScan`，避免引入重复 Bean 和装配漂移
- 不再把 `sharingjdbc` mapper 交给全局扫描，避免抢绑
- 尽量保持升级前的扫描边界和业务执行路径

#### 3.3.2 让 `sharingjdbc` 只由专属配置接管

`SharingJdbcMapperConfig` 继续只负责：

- `com.hupu.bbstopicnewmsv.newtopic.mapper.sharingjdbc`
- 绑定分片专用 `sqlSessionFactory`

这样可确保：

- `HcThreadsMapper`
- `HcThreadsAllMapper`
- `HcTmsgsMapper`

都通过分片数据源访问，不会落到普通数据源。

#### 3.3.3 将分片规则切换为 `CLASS_BASED`

`ShardingRuleSource` 由原来的 `INLINE` 表达式切换为：

- `CLASS_BASED` 表算法：`SingleKeyModuloTableShardingAlgorithm`
- `CLASS_BASED` 库算法：`SingleKeyModuloDatabaseShardingAlgorithm`

并把实际节点改为字面量模式：

- `hc_user_threads`：`hcthreadrecord.hc_user_threads_1 ~ 1000`
- `hc_threads`：`bbs.hc_threads_1 ~ 9999`
- `hc_tmsgs`：`tmsgs0/1/2.hc_tmsgs_1 ~ 99999`

收益：

- 去掉对 Groovy 表达式链路的依赖
- 路由逻辑完全回到 Java 代码内，可断点、可打日志
- 出问题时更容易确认是“算法问题”还是“节点配置问题”

#### 3.3.4 补充路由日志与测试入口

为了排查 `job` 场景下“请求到底是否走到分表”，新增了两类可观测性手段：

- 表路由日志：`topic-job table route`
- 分库路由日志：`topic-job datasource route`

同时在 `TestController` 增加了直接查询 `HcThreadsMapper` 的调试接口，便于绕开复杂业务流程，直接验证 `hc_threads` 路由是否生效。

#### 3.3.5 修正日志配置

`job` 使用的是 `log4j2`，不是 `logback`。本次把日志链路补全为：

- `application-sit.yml` 正确加载 `log4j2-sit.xml`
- `dev/sit/stg/prod` 环境都增加：
  - `ShardingSphere-SQL`
  - `org.apache.shardingsphere`

这样即使业务链路复杂，也能更直接看到实际路由和 SQL。

### 3.4 优化后效果

- `job` 的分片 mapper 绑定关系更稳定
- 启动扫描语义与原代码更接近
- JDK 21 下不再依赖 `INLINE` / Groovy 表达式
- 分库分表的路由过程可以通过日志或断点直接观察

### 3.5 推荐验证方式

#### 验证 `hc_threads`

1. 启动日志确认出现 `topic-job 分片数据源初始化完成`
2. 调用调试接口：`GET /test/08/{tid}`
3. 查看日志：
   - `topic-job table route`
   - `topic-job datasource route`

示例：

- `tid = 1000001`
- 目标表应为：`hc_threads_2`
- 目标库应为：`bbs`

#### 验证 `hc_tmsgs`

根据 `tid` 计算：

- 表：`hc_tmsgs_{tid / 15000 + 1}`
- 库：`tmsgs{((tid / 15000 + 1) % 3)}`

同时确认：

- 路由日志中的目标库
- 路由日志中的目标表
- 数据库中目标物理表的实际数据

---

## 4. 两次优化的共性原则

两次治理虽然作用于不同应用，但遵循了同一套原则：

### 4.1 稳定优先

优先保证规则一定生效，其次才考虑配置写法是否“简洁”。

### 4.2 明确装配边界

不依赖“扫到就算成功”的隐式行为，而是尽量做到：

- 数据源显式
- Mapper 归属显式
- 事务边界显式

### 4.3 去表达式化

把分片决策从字符串表达式迁回 Java 类，减少 JDK 版本变更带来的兼容性风险。

### 4.4 可观测性前置

分片问题一旦线上出现，排查路径必须能快速回答 3 个问题：

1. 请求有没有走到分片链路
2. 路由到哪个库
3. 路由到哪张表

---

## 5. 当前残余风险

### 5.1 `job` 的 `hc_tmsgs` 节点数量较大

`hc_tmsgs` 当前在启动阶段会生成大量 `<LITERAL>` 节点，功能上更稳定，但会增加：

- 启动耗时
- 内存占用
- 配置构建成本

后续如果要继续优化，可以考虑：

- 保留 `CLASS_BASED` 算法
- 进一步评估是否存在更轻量的实际节点声明方式

### 5.2 本地编译验证受外部依赖影响

当前仓库的 Maven 编译仍受父 POM 解析影响：

- `com.hupuarena:msv-foundation-parent:3.0.2`

如果本地或 CI 无法访问对应私服，无法完成完整编译验证。

---

## 6. 结论

这两次分表优化，本质上是在做同一件事：

- 把“能跑但不可控”的分片配置，改成“显式、稳定、可验证”的分片装配。

最终结果是：

- `msv-web` 的 `hc_user_topic` 分表链路在 JDK 21 下更稳定
- `topic-job` 的 `sharingjdbc` 分库分表链路不再依赖脆弱表达式
- 两个应用都具备了更清晰的排查入口和更低的误判成本
