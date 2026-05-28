# Collector Surface Performance Design

## 1. 背景

`watchmen-collector-surface` 当前承担采集链路的统一调度与执行，主流程可以概括为：

1. `TableExtractor` 从源表抓取增量主键，写入 `change_data_record`
2. `RecordToJsonService` 将记录转换成 `change_data_json`
3. `PostJsonService` 将 JSON 组装为 `scheduled_task`
4. `TaskListener` 执行任务并触发后续 pipeline

当前实现已经具备完整功能，但整体执行模型仍偏向“高频轮询 + 单段串行推进 + 多处逐条处理”。在源表数据量、触发表数量、租户数量、pipeline 数量上来之后，容易出现以下问题：

- 轮询任务重叠执行，导致同一 stage 竞争数据库与 CPU
- 上游生产速度大于下游消费速度时，缺少明确背压机制
- 多个阶段存在明显 N+1 查询、逐条 update、逐条 create 的写放大
- 元数据反复查询，热点配置和 schema 缺少有效缓存
- `count -> page -> shard -> insert` 的抽取模式对大表不够友好
- pipeline 触发阶段并发受限，最终吞吐受单任务串行执行限制

本文档目标是提出一套分阶段可落地的性能优化设计，在不改变业务语义的前提下，优先提升吞吐、降低数据库压力、增强系统稳定性。

## 2. 设计目标

### 2.1 目标

- 将采集链路从“轮询驱动的逐条处理”演进为“受控并发的批量处理”
- 在单租户大批量同步、多租户并发同步场景下保持稳定吞吐
- 减少数据库往返次数、锁冲突和重复扫描
- 为后续压测、容量规划和自动调参提供可观测指标

### 2.2 非目标

- 本次设计不改动业务语义，不改变 CDC 结果格式
- 本次设计不引入全新的消息中间件依赖，优先在现有架构上演进
- 本次设计不处理跨服务 pipeline 内部计算性能，仅关注 collector surface 侧吞吐

## 3. 当前架构

### 3.1 调度入口

当前由 `scheduler.py` 中的 `JobScheduler` 使用 `APScheduler.BackgroundScheduler` 注册多个 interval job：

- `TableExtractor`
- `RecordToJsonService`
- `PostJsonService`
- `CollectorEventListener`
- `TaskListener`
- `CleanOfTimeout`
- `cache_update`
- `S3Connector`

这意味着当前系统核心是“多个定时任务分别轮询各自队列”，优点是简单，缺点是：

- 默认缺少严格的 `max_instances` 约束时，容易发生 job 重叠
- 默认缺少明确的 `coalesce` / `misfire_grace_time` 策略时，积压后行为不可控
- 各 stage 之间没有统一的流量治理，容易出现上游压满下游

### 3.2 四段式数据流

#### Stage 1: Extract

`cdc/table_extractor.py`

- 先按条件 `count_by_criteria()`
- 再按条件 `find_limited_primary_keys_by_criteria()`
- 按 `last_max_pk` 推进
- 再按 shard 创建 `ChangeDataRecord`

#### Stage 2: Record To JSON

`cdc/record_to_json.py`

- 批量找出待处理记录并加锁
- 逐条更新为 `EXECUTING`
- 逐条转换与持久化 JSON
- `finalize()` 中还会回源表逐条删除

#### Stage 3: Post JSON

`cdc/post_json.py`

- 找出待投递 `change_data_json`
- 普通模式下逐条调用 `post_json`
- 顺序模式支持 object 分组，但普通模式仍存在逐条任务创建

#### Stage 4: Task Execute

`task/task_listener.py` + `task/handler.py`

- 拉取待执行任务
- 逐个执行任务
- 最终通过 `PipelineTrigger(..., asynchronized=False)` 同步触发 pipeline

这决定了最终吞吐上限并不只取决于抽取速度，还取决于末端同步触发能力。

## 4. 主要性能瓶颈

### 4.1 调度层瓶颈

- 所有 stage 都以固定秒级轮询运行，默认值大多为 `3s`
- 缺少 stage 级并发上限与 backlog 感知
- 缺少对“本轮未处理完，不应继续拉新批次”的统一约束

### 4.2 抽取层瓶颈

- `count_by_criteria()` 与 `find_limited_primary_keys_by_criteria()` 形成双扫描
- 大表场景下 count 成本高，而且对本轮是否继续没有强必要性
- 主键分页逻辑可继续优化为更纯粹的 keyset/watermark 模式
- 分片后逐条创建记录，批量写入能力不足
- 历史实现中的差集计算不适合超大集合场景

### 4.3 转换层瓶颈

- 记录状态迁移存在逐条 update
- `table_config`、source extractor 等元数据重复获取
- 转换完成后对源表逐条删除，数据库往返次数高

### 4.4 投递层瓶颈

- 普通模式下 `change_data_json -> scheduled_task` 仍偏逐条
- object grouping 只覆盖部分模型，bulk 思路未全面推广
- 同一个 model trigger 下的热点数据可能产生大量小任务

### 4.5 执行层瓶颈

- `TaskListener` 本质仍是串行 drain 队列
- pipeline 同步触发导致单任务耗时直接传导到 stage 吞吐
- 不同 tenant、pipeline、object 之间缺少隔离与限流

### 4.6 元数据与缓存瓶颈

- `table_config`、`trigger_model`、schema、pipeline metadata 存在重复读取
- cache update 存在，但尚未形成“热路径强依赖缓存，冷路径回源”的清晰层次

## 5. 优化原则

- 只做直接提升吞吐和稳定性的改造，不做额外抽象
- 优先减少数据库 round-trip，再提升并发度
- 先建立背压，再放大并发；否则只会更快地产生积压
- 优先保证同一对象、同一 tenant、同一 pipeline 的顺序与隔离语义
- 每项优化都必须可观测、可回滚、可灰度

## 6. 目标架构

## 6.1 调度与并发控制

### 现状问题

当前多个 interval job 基于固定频率触发，但系统并不知道下游是否已经积压，也不知道本轮执行是否尚未结束。

### 设计方案

#### 1. 为每个 job 明确调度策略

所有核心 job 建议显式设置：

- `max_instances=1`
- `coalesce=True`
- 合理的 `misfire_grace_time`

目的：

- 防止同一 stage 重叠执行
- 避免瞬时抖动后连续补跑多个历史周期
- 让 interval job 更接近“定时唤醒一次 drain loop”

#### 2. 由“固定轮询”演进为“轮询 + backlog 感知”

每个 stage 执行前先读取对应 backlog 指标，例如：

- 待抽取 trigger table 数
- 待转换 `change_data_record` 数
- 待投递 `change_data_json` 数
- 待执行 `scheduled_task` 数

据此决定：

- 本轮是否继续拉取新数据
- 本轮批量大小是否降级
- 是否对上游 stage 施加背压

#### 3. 建立 stage 级背压规则

推荐规则：

- 当 `scheduled_task` backlog 超阈值时，暂停 `PostJsonService` 扩大任务规模
- 当 `change_data_json` backlog 超阈值时，暂停 `RecordToJsonService` 继续生成 JSON
- 当 `change_data_record` backlog 超阈值时，暂停 `TableExtractor` 新增记录

这样可以把系统从“无界生产”改成“受控流动”。

#### 4. 增加有限并发 worker

不是把整个 job 放大成无限并发，而是为每个 stage 引入可配置 worker 数：

- `extract_workers`
- `record_to_json_workers`
- `post_json_workers`
- `task_workers`

并通过租户、对象、pipeline 维度的 key 做分区处理，保证局部顺序。

## 6.2 抽取层优化

### 目标

减少源表扫描成本，降低 `change_data_record` 写入放大，提升大表增量抓取效率。

### 方案

#### 1. 去掉前置全量 count

当前 `data_count == 0` 时会先调用 `count_by_criteria()`。建议改为：

- 直接按 watermark/keyset 取一批主键
- 根据实际返回数量判断是否还有下一批
- 仅在管理台或日志侧统计估算量，不把 count 作为主流程前置条件

收益：

- 避免每轮先做一次高成本 count
- 对超大表和复杂筛选条件更加友好

#### 2. 统一为 watermark/keyset 分页

以 `(last_max_pk, updated_at)` 或主键区间为驱动：

- 每轮只关心“下一批”
- 不依赖 offset
- 尽量避免重复扫描旧数据

若主键不连续，不需要补齐空洞，只需要保证：

- watermark 单调前进
- 失败可重试
- 幂等可接受

#### 3. 批量创建 `ChangeDataRecord`

当前按 shard 分片后仍偏逐条创建。建议增加 repository/service 层 bulk 接口：

- `create_records(records: list[ChangeDataRecord])`
- 数据库侧使用 bulk insert / executemany

收益：

- 大幅降低抽取阶段写入 RT
- 降低 ORM/DAO 层对象构造开销

#### 4. 取消高成本差集逻辑

如果当前仍存在集合差集或 numpy 辅助去重逻辑，建议改为：

- 基于主键顺序推进，而不是对大集合做内存差集
- 去重依赖唯一键或状态表

原则是把“去重”转成“幂等写入 + 唯一约束”，而不是“大数组集合运算”。

#### 5. 源表删除策略解耦

当前删除动作出现在后续 stage 的 `finalize()` 中，这会让上游吞吐与下游完成强耦合。建议：

- 抽取阶段只负责标记与搬运，不负责即时删除
- 删除改为异步批量清理
- 清理前提为下游已完成且达到幂等安全点

对于必须删除源数据的场景，也应改为批量删除：

- `delete_by_primary_keys(list[pk])`

而不是逐条 `delete_one_by_primary_keys()`。

## 6.3 Record To JSON 优化

### 目标

降低状态流转与元数据读取成本，让转换层具备真正批处理能力。

### 方案

#### 1. 锁定后批量更新状态

当前代码会对拿到的 records 逐条 `update(record)`。建议改为：

- 先批量锁定一批记录
- 一次性 `update_by_ids(ids, {"status": EXECUTING})`

完成后再统一提交处理结果。

#### 2. 批量加载配置与 extractor

很多记录来自同一 `tableName + tenantId`。建议按此维度分组：

- 一次读取 `table_config`
- 一次拿到 source extractor
- 一次处理整组 records

这样能显著减少配置查询与对象构建。

#### 3. 批量写入 `ChangeDataJson`

将逐条转换结果暂存到内存 batch 中，再统一 bulk insert。

建议按如下维度批次提交：

- 同 tenant
- 同 table
- 同 trigger event

#### 4. 批量 finalize

当前 `finalize()` 包含逐条回源表删除。建议拆成：

- `finalize_records(record_ids)`
- `finalize_source_rows(table_config, primary_keys)`

两者都走批量接口。

## 6.4 Post JSON 优化

### 目标

减少 JSON 到任务的扩散系数，避免把大量小 JSON 放大成更多小任务。

### 方案

#### 1. 普通模式也支持批量投递

当前顺序模式已有 grouped path，但普通模式仍偏逐条。建议统一成两类任务模型：

- `single-object ordered task`
- `bulk task`

普通模式下，允许把同一 `modelTriggerId`、同一批次、同一 tenant 的多个 JSON 合并进一个任务载荷。

#### 2. 任务创建 bulk 化

新增：

- `create_tasks(tasks: list[ScheduledTask])`
- `update_jsons_by_ids(ids, payload)`

避免一条 JSON 对应一次 create。

#### 3. 控制任务粒度

为不同模型配置任务粒度：

- 高频轻任务模型：合并为 bulk task
- 严格顺序模型：按 object id 保持串行
- 高成本 pipeline：限制同一 pipeline 并发数

#### 4. 引入幂等投递键

对 `change_data_json -> scheduled_task` 建立幂等键，避免重复投递时生成重复任务。

幂等键建议包含：

- tenant id
- model trigger id
- object id 或 batch id
- version / event sequence

## 6.5 Task Listener 与 Pipeline 触发优化

### 目标

让最终执行阶段从串行 drain 转为受控并发执行，同时保护下游 pipeline。

### 方案

#### 1. 受控并发执行

当前 `for unfinished_task in unfinished_tasks` 的串行执行模式建议改为：

- 先按 tenant / pipeline / object 进行分组
- 组内串行
- 组间有限并发

推荐约束：

- 同 object: 严格串行
- 同 pipeline: 限流并发
- 不同 tenant: 配额隔离

#### 2. 引入异步执行池

既然 `process_sub_tasks()` 已是 async，建议用共享 semaphore 控制并发，例如：

- `task_execution_concurrency`
- `pipeline_trigger_concurrency`

不要在每条任务上单独 `run()` 新事件循环，而应尽量复用统一的 async 执行上下文。

#### 3. 让 pipeline 触发支持异步提交

`PipelineTrigger(..., asynchronized=False)` 是当前吞吐关键限制点。建议演进方向：

- collector 负责可靠提交
- pipeline 引擎负责异步执行
- collector 只等待“已接收/已入队”，不等待“完全执行完毕”

如果短期不能修改为完全异步，也建议先做：

- pipeline 执行超时保护
- 单 pipeline 并发限制
- 慢任务隔离

#### 4. 明确重试与死信策略

当前已有 timeout cleanup，但执行层仍需要更明确的失败策略：

- 瞬时错误：有限重试
- 数据错误：快速失败并标记
- 下游拥塞：延迟重试

这样才能避免慢任务长期占据 worker。

## 6.6 元数据缓存设计

### 缓存对象

建议重点缓存：

- `table_config`
- `trigger_event`
- `trigger_model`
- `topic schema`
- pipeline 路由与执行元数据
- extractor/connectors 的可复用实例

### 缓存层次

分成两层：

#### 1. 进程内热缓存

用于高频热点访问，TTL 较短，例如 30s 到 300s。

适合：

- 相同 table 的配置重复读取
- 相同 model trigger 的元数据查询

#### 2. 定时刷新缓存

保留当前 `cache_update` 机制，但职责改为：

- 主动刷新热点 metadata
- 驱逐已失效配置
- 更新版本号

### 失效策略

建议元数据对象包含 `version` 或 `last_modified`：

- 命中缓存但版本未变时直接使用
- 版本变化后局部失效
- 避免每次全量刷新

### 设计原则

- 热路径优先读缓存
- 冷路径允许回源
- 缓存 miss 不影响正确性，只影响性能

## 6.7 数据模型与存储优化

### 1. 为队列表建立明确索引

重点检查以下字段的组合索引：

- `status`
- `tenant_id`
- `table_name`
- `model_trigger_id`
- `is_posted`
- `task_id`
- `created_at`

典型索引方向：

- 待处理队列检索索引
- 状态迁移更新索引
- 任务回查索引

### 2. 用状态流转替代重复扫描

能通过状态标记拿到数据时，就不要再次扫描大表。

例如：

- `WAITING -> EXECUTING -> DONE -> FAILED`

每个 stage 只关心自己的状态集合。

### 3. 为批量操作预留 repository API

建议新增但不一次性全量替换：

- `find_and_lock_batch()`
- `update_by_ids()`
- `bulk_create()`
- `bulk_delete_by_ids()`
- `bulk_delete_by_primary_keys()`

这样后续每个 stage 都能逐步从逐条操作迁移到批量操作。

## 7. 配置与调参建议

当前默认值中，多个轮询间隔均为 `3s`，批量上限较大，例如：

- `EXTRACT_TABLE_LIMIT_SIZE = 100000`
- `EXTRACT_TABLE_RECORD_SHARD_SIZE = 10000`
- `POST_OBJECT_ID_LIMIT_SIZE = 500`
- `POST_SEQUENCE_JSON_LIMIT_SIZE = 1000`

这些值适合作为“上限”，但不适合作为所有场景的固定工作点。建议增加动态参数：

- `stage_max_backlog`
- `stage_pause_threshold`
- `extract_batch_size`
- `record_to_json_batch_size`
- `post_json_batch_size`
- `task_execution_concurrency`
- `pipeline_execution_concurrency`
- `metadata_cache_ttl`

调参原则：

- 高延迟数据库场景：减小单批次，控制锁持有时间
- 高吞吐数据库场景：增大 bulk batch，减少 round-trip
- pipeline 偏慢场景：降低上游拉新速率，优先保系统稳定

## 8. 观测指标

优化必须以可观测为前提，建议建立以下指标。

### 8.1 Backlog 指标

- `collector.extract.pending_tables`
- `collector.record.pending_records`
- `collector.post.pending_jsons`
- `collector.task.pending_tasks`

### 8.2 吞吐指标

- 每分钟抽取主键数
- 每分钟生成 JSON 数
- 每分钟生成任务数
- 每分钟成功触发 pipeline 数

### 8.3 延迟指标

- 各 stage 单批处理耗时
- 从源表进入 `change_data_record` 的延迟
- 从 `change_data_record` 到 `scheduled_task` 的延迟
- 从 `scheduled_task` 到 pipeline 接收的延迟

### 8.4 质量指标

- stage 失败率
- 重试次数
- timeout cleanup 次数
- 重复任务率
- 缓存命中率

### 8.5 资源指标

- 数据库 QPS
- 慢查询数
- 进程 CPU / 内存
- 单租户资源占比

## 9. 压测方案

建议至少覆盖三类场景：

### 场景 A: 单大表增量

- 单租户
- 单张大表持续写入
- 验证抽取与转换吞吐上限

### 场景 B: 多租户并发

- 多租户同时采集
- 每个租户多张表
- 验证隔离与公平性

### 场景 C: 慢 pipeline 拖尾

- 下游 pipeline 人为增加延迟
- 验证背压与限流是否生效

压测输出至少包括：

- 各 stage backlog 曲线
- 每 stage p50/p95/p99 耗时
- 单位时间任务完成数
- 数据库压力变化

## 10. 分阶段实施计划

### Phase 1: 低风险收益项

- 为 APScheduler job 增加 `max_instances`、`coalesce`、`misfire` 配置
- 为各 stage 建立 backlog 指标
- 增加 bulk repository API
- 将逐条状态更新改成 `update_by_ids`
- 补充关键索引

预期收益：

- 降低 job 重叠与数据库写放大
- 让系统具备基本可观测性

### Phase 2: 核心吞吐优化

- 抽取阶段去掉前置 count
- 统一 keyset/watermark 分页
- `ChangeDataRecord` 与 `ChangeDataJson` 批量写入
- 普通模式下的 `PostJsonService` 批量投递
- 源表删除改为批量接口

预期收益：

- 显著减少数据库 round-trip
- 提升整条链路的稳定吞吐

### Phase 3: 执行层治理

- `TaskListener` 改为受控并发模型
- 增加 tenant / pipeline / object 三级限流
- 推进 pipeline 触发异步化或半异步化

预期收益：

- 解决末端串行瓶颈
- 避免少数慢 pipeline 拖垮整体处理能力

### Phase 4: 智能调参与缓存深化

- metadata cache 分层
- backlog 驱动的动态批次调节
- 自动化压测与容量基线

预期收益：

- 从“可运行”提升到“可持续扩展”

## 11. 验收标准

当以下条件满足时，可认为 collector surface 性能优化达标：

- 在目标压测数据量下，四个 stage 不出现持续失控积压
- 核心队列表操作以批量接口为主，而非逐条更新
- 大表抽取路径不再依赖前置全量 count
- 慢 pipeline 不会导致上游无限放大 backlog
- 可以按 tenant、pipeline、table 维度观察吞吐与失败率
- 同等业务负载下，数据库 round-trip 和总耗时显著下降

## 12. 推荐优先级

如果只允许优先做最有价值的三件事，建议顺序如下：

1. 调度防重叠 + backlog 背压
2. 全链路 bulk 化，尤其是 `extract -> record_to_json -> post_json`
3. `TaskListener` 受控并发 + pipeline 触发解耦

这三项组合可以最快把 collector surface 从“功能可用”提升到“可承载持续增量流量”。
