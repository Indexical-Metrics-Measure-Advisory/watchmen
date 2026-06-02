# watchmen-batch-writer 代码地图

本文档面向需要修改/扩展 batch-writer 的开发人员，描述当前实现（基于 `docs/HLD.md` / `docs/DESIGN.md` 设计）的**代码结构、模块职责、关键数据流、扩展点**。与设计文档不同，本文聚焦**代码层面**：哪个类在哪个文件、关键方法、调用关系、容易踩坑的地方。

> 对应版本：`pyproject.toml` 中 `version = 18.0.0`

---

## 1. 模块拓扑

```
packages/watchmen-batch-writer/
├── pyproject.toml
└── src/watchmen_batch_writer/
    ├── __init__.py                       # 公开 API（懒加载入口）
    ├── __main__.py                       # `python -m watchmen_batch_writer` 入口
    ├── app.py                            # 启动入口（settings 初始化 + 装配 + 优雅关闭）
    ├── settings.py                       # 配置模型（环境变量驱动）
    ├── cdc_model.py                      # Canal CDC 消息模型 + 行列展开
    ├── config_resolver.py                # 配置查找链：table → model → raw topic → ODS + field map + 编译 pipeline
    ├── consumer.py                       # Kafka 消费循环 + offset 提交 + 重连
    ├── accumulator.py                    # 批量缓冲（按 table/op 分组 + 双阈值 + 失败回填）
    ├── writer.py                         # 批量写入（field_map 转换 + 操作路由 + adapter 选择 + 路径分发）
    ├── write_buffering_data_service.py   # NEW: 写入代理，拦截单行 insert/update 攒批
    ├── batch_pipeline_storages.py        # NEW: 扩展 RuntimeTopicStorages + 持有 buffer 生命周期
    ├── batch_pipeline_runner.py          # NEW: 跑 compiled_pipeline + 攒批 + flush
    ├── adapters/
    │   ├── __init__.py                   # 公共导出
    │   ├── base.py                       # BaseAdapter + get_adapter 工厂
    │   ├── postgres.py                   # PG: COPY + 临时表 ON CONFLICT
    │   ├── mysql.py                      # MySQL: 多行 INSERT ... ON DUPLICATE KEY
    │   └── generic.py                    # 降级: insert_all / 逐行 upsert
    ├── monitor.py                        # Prometheus 指标
    ├── health.py                         # /health + / 端点（HTTP）
    └── retry.py                          # 通用 retry_async 工具
```

### 1.1 外部依赖（项目内）

| 依赖 | 用途 | 关键 API |
|---|---|---|
| `watchmen_collector_kernel` | 取 `CollectorTableConfig` / `CollectorModelConfig` | `CollectorTableConfigService.find_by_table_name`、`CollectorModelConfigService.find_by_name` |
| `watchmen_data_kernel` | 取 Topic/Pipeline/数据源 + `TopicSchema` + 存储 helper | `TopicService.find_schema_by_name` / `find_schema_by_id`、`PipelineService.find_by_topic_id`、`ask_topic_storage`、`ask_topic_data_service`、`ask_topic_data_entity_helper` |
| `watchmen_meta` | 读 meta 存储 + `ask_meta_storage` / `ask_snowflake_generator` | snowflake id 生成 |
| `watchmen_rest` | PAT 认证 | `get_principal_by_pat`、`retrieve_authentication_manager` |
| `watchmen_storage` | 抽象 `TopicDataStorageSPI` | `connect` / `commit` / `close` / `register_topic` / `get_entity_helper` |
| `aiokafka` | Kafka 客户端 | `AIOKafkaConsumer` |
| `prometheus_client` | 指标 | `Counter` / `Gauge` / `Histogram` / `start_http_server` |

---

## 2. 数据流（一条 Canal 消息的生命周期）

```
┌──────────┐  poll  ┌────────────┐  parse  ┌──────────────┐
│  Kafka   │ ─────▶ │  Consumer  │ ──────▶ │ cdc_model    │  CanalMessage
│ (logbase)│        │ (consumer) │         │ extract_rows │  → List[Row]
└──────────┘        └─────┬──────┘         └──────────────┘
                          │ add_many
                          ▼
                    ┌──────────────┐
                    │ Accumulator  │  (group by table:tenant:op)
                    └──────┬───────┘
                           │ threshold / interval
                           ▼
                    ┌──────────────┐
                    │   Writer     │  (field_map + prepare_data + adapter)
                    └──────┬───────┘
                           │
                ┌──────────┼──────────┐
                ▼          ▼          ▼
            Postgres    MySQL      Generic
            (COPY/      (multi-    (insert_all
             staging)    row)        / 逐行)
                │          │          │
                └──────────┴──────────┘
                           │
                           ▼  ok
                    ┌──────────────┐
                    │  Consumer    │  commit offsets per (topic, partition)
                    │ _commit_...  │  with offset = max + 1
                    └──────────────┘
```

详细步骤见 `docs/DESIGN.md § 3.1`。

---

## 3. 模块逐个拆解

### 3.1 `settings.py`

| 内容 | 说明 |
|---|---|
| `BatchWriterSettings` | pydantic-like `SettingsModel`（`watchmen_model.common`） |
| `settings` | 模块级单例 |
| `ask_batch_writer_settings()` | 访问器 |

**关键字段**（完整列表见 `settings.py:5-29`）：

| 字段 | 默认 | 用途 |
|---|---|---|
| `bootstrapServers` | `localhost:9092` | Kafka bootstrap |
| `topics` | `[]` | 订阅的 topic 列表 |
| `groupId` | `watchmen-batch-writer` | consumer group |
| `pat` | `None` | 租户关联 token |
| `batchSize` | `5000` | 数量阈值 |
| `flushIntervalSeconds` | `10` | 时间阈值 |
| `softDeleteFlagColumn` | `_deleted` | DELETE 标记列名 |
| `softDeleteFlagValue` | `1` | 标记值 |
| `prometheusPort` | `9091` | Prometheus `/metrics` 端口 |
| `healthPort` | `9092` | `/health` 端口 |
| `enableAutoCommit` | `False` | 强制手动 commit |
| `maxRetries` | `3` | 写入失败重试次数 |
| `retryDelaySeconds` | `1.0` | 写入重试间隔 |
| `reconnectBaseDelaySeconds` | `1.0` | Kafka 重连指数退避基数 |
| `reconnectMaxDelaySeconds` | `30.0` | Kafka 重连最大间隔 |
| `preloadTableNames` | `[]` | 启动时预解析的表名列表 |

环境变量映射在 `app.py:_init_settings()` 的 `_ENV_BINDINGS` 表中，**修改时两边都要改**。

---

### 3.2 `cdc_model.py`

**职责**：Canal 格式 CDC 消息的 Pydantic 模型 + 把一条消息展开成多行。

| 符号 | 位置 | 作用 |
|---|---|---|
| `class CanalMessage(ExtendedBaseModel)` | `cdc_model.py:6` | Kafka 消息 schema；与 `docs/DESIGN.md § 2.2` 表对齐 |
| `OP_INSERT/OP_UPDATE/OP_DELETE` | `cdc_model.py:19-21` | 操作类型常量 |
| `parse_operation_type(msg_type)` | `cdc_model.py:24` | 容错解析（接受 `INSERT`/`I`/`insert`） |
| `extract_rows_from_canal(message)` | `cdc_model.py:37` | 把 `data[]` 展开成行，注入 `_op`/`_binlog_id`/`_ts`/`_seq` 内部字段 |

**关键内部字段**（行 dict 上以 `_` 前缀，与 ODS 字段隔离）：

| 字段 | 来源 | 用途 |
|---|---|---|
| `_op` | `parse_operation_type(type)` | 路由到 INSERT/UPDATE/DELETE group |
| `_binlog_id` | `CanalMessage.id` | 主排序键 |
| `_seq` | `data[]` 索引 | 同 binlog 内的二级排序键 |
| `_ts` | `CanalMessage.ts` | 时间戳（目前未使用，预留） |
| `_table` | `CanalMessage.table` | 调试用 |

**写 writer 时**：`_` 前缀的字段会被 `writer._prepare_rows` 过滤掉，不进入 ODS。

**DELETE 行为**：取 `old[i]`（缺则回退 `data[i]`），保证 PK 至少来自 `old`。

---

### 3.3 `config_resolver.py`

**职责**：完成 `docs/DESIGN.md § 2.2` 描述的查找链 + **合并多 pipeline 的 field mapping**。

#### 3.3.1 类与数据类

```python
class ResolvedConfig:
    table_name, tenant_id
    raw_topic: Topic           # Kafka source topic
    raw_schema: TopicSchema
    ods_topic: Topic           # 写入目标
    ods_schema: TopicSchema
    field_map: Dict[str, str]  # {raw_factor_name: ods_factor_name}
    data_source: DataSource    # ODS 存储的数据源（决定 adapter）
    storage, data_service, entity_helper  # 已注入 ODS topic 的存储栈
    pk_columns: List[str]      # ODS 主键列（来自 unique index factors）
    principal_service
    is_complete -> bool         # ods_schema & ods_topic 都非空

class ConfigResolver:
    resolve(table, tenant_id) -> Optional[ResolvedConfig]
    preload(table_names, tenant_id)  # 启动时预热
    invalidate(table, tenant_id)     # 缓存失效
```

**重要**：当前 `ResolvedConfig.storage / data_service / entity_helper / pk_columns` 是从 **raw topic schema** 解析出来的（不是 ODS）。`writer.py` 当前通过 `get_entity_helper()` 直接拿到 entity_helper，再 `get_column_names()` 取列。**注意**：`get_column_names` 取的是 ODS topic 的列（即 storage 关联的 topic）— 这取决于 storage 的状态。**改动时务必确认 `storage` 已 register 的是 ODS topic**。

**当前实现细节**（位于 `config_resolver.py:_resolve_ods_mapping`）：
1. `ask_topic_storage(raw_schema, principal_service)` + `register_topic(raw_topic, data_source)` — 用 **raw topic** 注册 storage。
2. **问题**：writer 调用 `helper.get_column_names()` 拿到的是 raw topic 的列名（与 ODS 列名不一致）。

> **已知问题**（待修复）：`_resolve_ods_mapping` 之后应再用 `ods_schema` 重新构建 `storage/data_service/entity_helper`，保证 `get_column_names()` 返回 ODS 列名。

#### 3.3.2 静态方法

| 方法 | 行 | 作用 |
|---|---|---|
| `_collect_mappings_by_target(pipelines)` | `config_resolver.py:289` | **关键**：遍历所有 pipeline/stage/unit/action，把 write action 按 `action.topicId` 分组合并 |
| `_pick_best_target(mappings, seen_order)` | `config_resolver.py:329` | 选合并后 mapping 数最多的 target，平局时按 first-seen |
| `_build_field_map(raw, ods, mappings)` | `config_resolver.py:316` | 合并后的 MappingFactor → `{raw_name: ods_name}` |
| `_find_pk_columns(topic, schema)` | `config_resolver.py:340` | 从 `FactorIndexGroup.UNIQUE_INDEX_*` 推 PK 列，缺省 `id_` |
| `_is_unique_index_group(g)` | `config_resolver.py:332` | 枚举判断 |

**修改 _resolve_ods_mapping 的设计要点**（避免再次走偏）：

- 同一个 ODS 目标可能被多条 pipeline / 多个 action 共同写入，**合并**所有 MappingFactor。
- 多 ODS 目标时：**mapping 数最多**者胜出；平局按 first-seen。
- 过滤条件：`enabled=False` / `topicId` 为空 / `mapping` 为空。
- 单元测试：`/tmp/test_batch_writer_isolated.py:test_collect_mappings_groups_by_target` 等 4 个。

#### 3.3.3 模块级工具

`transform_canal_row(row, field_map) -> Dict`：在 writer 中应用 field_map，未命中的列被丢弃（避免把 CDC 内部字段写入 ODS）。

---

### 3.4 `accumulator.py`

**职责**：把同 `(table, tenant, op)` 的行攒成批，按双阈值触发 flush；失败回填；返回 FlushResult 携带 `partition_offsets`。

| 类 | 位置 | 角色 |
|---|---|---|
| `BatchGroup` | `accumulator.py:12` | 一个 `(table, tenant, op)` 的批量 |
| `FlushResult` | `accumulator.py:54` | flush 回调的返回值 |
| `Accumulator` | `accumulator.py:67` | 总调度 |

**`BatchGroup` 关键方法**：
- `add(row, (partition, offset))`：仅追加，不做 flush 决策
- `sorted_rows()`：按 `(_binlog_id, _seq)` 稳定排序
- `max_offset_per_partition()`：返回 `{partition: max_offset}`（去重取最大）

**`FlushResult` 字段**：
- `group`、`ok: bool`、`error`
- `partition_offsets: Dict[int, int]` — 仅 `ok=True` 时填，供 consumer 提交 offset

**`Accumulator` 关键方法**：

| 方法 | 行为 |
|---|---|
| `start()` | 启动 `periodic_flush` 后台任务 |
| `stop()` | 取消后台任务 + `flush_all()` 排空 |
| `add_many(rows, config, ..., topic_partition, start_offset) -> List[BatchGroup]` | **批量**入队，命中阈值的 group 被 `pop` 并返回 |
| `flush_overflow(groups)` | flush 指定的 group（来自 `add_many` 返回），失败回填 |
| `flush_all()` | flush 全部未溢出 group，失败回填 |
| `_flush_one(group, requeue_on_fail)` | 实际调用 on_flush；失败时把 group 放回 `self._groups` 头部，`_total_count` 累加 |

**回填逻辑**（关键 — P0-2 / P0-4 修复点）：
```python
# accumulator.py:147-156
if requeue_on_fail:
    async with self._lock:
        existing = self._groups.get(group_key)
        if existing is None:
            self._groups[group_key] = group
        else:
            existing.rows = group.rows + existing.rows     # 失败的在前面
            existing.offsets = group.offsets + existing.offsets
        self._total_count += group.size()
```

**注意**：
- `add()` 已被 `add_many()` 取代，旧 API 不可用。
- `_total_count` 在 add 时累加，flush 成功不递减，失败回填再累加一次。**不能**简单用作"未 flush 行数"。
- 后台任务 `periodic_flush` 只在 `_total_count > 0` 时调 `flush_all()`，避免空转。

---

### 3.5 `writer.py`

**职责**：单个 BatchGroup 的实际写入：field_map 转换 → schema 准备 → 主键解析 → adapter 选择。

| 方法 | 行为 |
|---|---|
| `write_batch(group)` | 入口；按 feature flag 分发到 legacy 或 pipeline-runner 路径 |
| `_write_via_pipeline_runner(group, config, ...)` | 路径 2（feature-flag enabled）：用 `BatchPipelineRunner` 跑 compiled pipeline |
| `_write_legacy(group, config, ...)` | 路径 1（默认）：`adapter.batch_insert` / `batch_upsert` |
| `_prepare_rows(raw_rows, config)` | 逐行 `transform_canal_row → schema.prepare_data → try_to_wrap_to_topic_data → assign_fix_columns_on_create` |
| `_get_db_helper(config)` | 直接返回 `config.entity_helper`（**注意**：见 3.3.1 的已知问题） |
| `_resolve_pk_columns_for_write(config)` | 从 `config.pk_columns` 取，缺省 `id_` |
| `_mark_soft_delete(rows, settings)` | 把每行的 `softDeleteFlagColumn` 设为 `softDeleteFlagValue` |

**op 路由**（legacy 路径）：
- `INSERT` → `adapter.batch_insert(storage, helper, rows)` → PG: COPY / MySQL: 多行 INSERT
- `UPDATE` / `DELETE` → `adapter.batch_upsert(storage, helper, rows, pk_columns)`
  - DELETE 时先调用 `_mark_soft_delete` 设置标记列
  - **P0-5 关键**：依赖 adapter 的 `ON CONFLICT (pk) DO UPDATE SET <non-pk> = EXCLUDED.<non-pk>` 语义，**不覆盖非 PK 列**

**路径分发**（`write_batch` 决策树）：
1. `op == DELETE` → 走 legacy 软删除路径（pipeline 的 `CompiledDeleteRowAction` 是物理删除，**不适用**）
2. `settings.usePipelineRunner == True` 且有 `config_resolver` → 走 pipeline-runner 路径
3. 否则 → 走 legacy 路径
4. 任何异常 → 回退到 legacy 路径（带 warning 日志）

**指标**：
- `ROWS_WRITTEN.labels(table, op).inc(count)` — `op` 在 pipeline-runner 路径下为 `'pipeline'`
- `WRITE_ERRORS.labels(table).inc()`
- `BATCH_FLUSH_DURATION.labels(table).time()` — 自动 observe_duration

---

### 3.6 `write_buffering_data_service.py` — Pipeline 拦截写入代理

**职责**：拦截 compiled pipeline 的单行写调用，把数据攒在内存 buffer；`flush()` 走 `storage.batch_insert` / `batch_upsert`。是设计文档 §3.3.1 的本地实现版本。

> **设计偏离**：文档原方案是放在 `watchmen-data-kernel` 并继承 `TopicDataService`。本实现**不继承** `TopicDataService` —— 改为**独立包装类**，直接持有 helper + storage + snowflake + principal。理由：避免在 `TopicDataService` 基类增加分割点（`_prepare_insert_data` / `_do_insert`），跨包改动成本高；本地类更易演化和测试。

| 方法 | 行为 |
|---|---|
| `__init__(schema, helper, storage, sf, principal)` | 持有 ODS 上下文 + 三个 buffer list |
| `insert(data)` | 复刻 `TopicDataService.insert` (data_service.py:357) 的 helper 赋值 → buffer，**不调** `storage.insert_one` |
| `update_by_id_and_version(data, criteria)` | 复刻 `TopicDataService.update_by_id_and_version` (data_service.py:376) 的 helper 赋值 → buffer |
| `flush(pk_columns)` | `storage.batch_insert(buffer)` + `storage.batch_upsert(buffer, pk)`；清空 buffer |
| `reset()` | 清空 buffer（异常恢复用） |
| `_build_id_version_criteria(data)` | 复刻 `TopicStructureService.build_id_version_criteria` (data_service.py:72) |

**关键不变量**：
- helper 赋值逻辑必须与 `TopicDataService.insert/update` 保持同步 —— 上游改动时必须同步修改本类
- 不实现读方法（`find` / `exists`）—— `CompiledInsertOrMergeRowAction` 调 `find` 时会得到 `AttributeError`，触发该 action 的 insert 分支（这是预期行为，见设计文档 §5.1）

---

### 3.7 `batch_pipeline_storages.py` — 扩展 RuntimeTopicStorages

**职责**：在标准 `RuntimeTopicStorages` 之上加 buffer 生命周期管理。是设计文档 §3.3.2 的本地实现版本。

> **设计偏离**：原方案是给 `TopicStorages` 接口加 `ask_topic_data_service()` 方法。本实现**不修改**该接口 —— 改为 `BatchPipelineRunner.write_batch()` 在执行期间 monkey-patch 全局 `service_helper.ask_topic_data_service` 函数。这样既保持向后兼容，又实现了拦截。代价是 monkey-patch 在并发场景下不安全（batch-writer 串行处理 batch，目前安全）。

| 属性/方法 | 行为 |
|---|---|
| `__init__(principal, target_ods_topic_id)` | 继承 `RuntimeTopicStorages` 的 storage 缓存 |
| `get_or_create_buffer(ods_schema, ods_storage)` | 懒构造 `WriteBufferingTopicDataService`，单例 |
| `flush_buffer(pk_columns)` | 调 `buffer.flush(pk_columns)` |
| `reset_buffer()` | 调 `buffer.reset()` |
| `target_ods_topic_id` | getter |
| `buffer_size` | getter（`buffer.total_buffer_size`） |

---

### 3.8 `batch_pipeline_runner.py` — 主流程

**职责**：跑 compiled pipeline + 攒批 + flush。是设计文档 §3.3.3 的本地实现。

| 方法 | 行为 |
|---|---|
| `__init__(compiled_pipeline, principal, ods_schema, ods_storage, pk_columns)` | 构造 buffer + 注入 ods_storage 到 storages 缓存 |
| `write_batch(group)` | 入口；per-row try/except；最后 flush |
| `_run_one(cdc_row, group)` | 单条 CDC row 跑 pipeline.run()；丢弃返回的 cascaded context |
| `_patch_ask_topic_data_service()` | `@contextmanager`：临时替换全局 `service_helper.ask_topic_data_service`，目标 ODS topic 返回 buffer；其他 topic 走原 factory |

**关键设计**：
- 拦截机制：monkey-patch `service_helper.ask_topic_data_service` —— 见 §3.7
- 级联抑制：pipeline.run() 内部创建的 `QueuedPipelineContexts`（compiled_pipeline.py:121）通过返回值传出；runner **直接丢弃**这些 context
- DELETE 不走 pipeline-runner —— writer.py 在 `op == DELETE` 时强制走 legacy 软删除路径

---

### 3.9 `consumer.py`

**职责**：Kafka 消费循环 + 错误重连 + 写入成功后才提交 offset。

#### 3.9.1 关键类

```python
class KafkaConsumer:
    _consumer: AIOKafkaConsumer | None
    _accumulator: Accumulator | None
    _running: bool
    _shutdown_event: asyncio.Event
    _pending_commits: Dict[TopicPartition, int]   # 待提交的 max offset
```

#### 3.9.2 主流程

```
start():
    init Accumulator
    register SIGTERM/SIGINT handlers
    _run_with_reconnect()

_run_with_reconnect():
    while running:
        try _consume()
        on exception: backoff = min(base * 2^attempt, max)
                      await shutdown_event.wait(timeout=backoff)   # 优雅退出 or 退避

_consume():
    build AIOKafkaConsumer
    for msg in consumer:
        _process_message(msg)
        update CONSUMER_LAG gauge

_process_message(msg):
    parse CanalMessage
    config_resolver.resolve(table, tenant)
    extract_rows_from_canal
    overflow = accumulator.add_many(...)
    if overflow:
        results = accumulator.flush_overflow(overflow)
        _handle_flush_results(results)  # collect ok offsets and commit

_handle_flush_results(results):
    for r in results if r.ok:
        topic = _resolve_topic_for_offset(r.group)   # 从 group.config.raw_topic.name
        for partition, offset in r.partition_offsets.items():
            tp = TopicPartition(topic, partition)
            best[max(tp)] = offset
    merge into _pending_commits
    _commit_pending()

_commit_pending():
    for tp, offset in pending: to_commit[tp] = offset + 1
    consumer.commit(to_commit)   # at-least-once 边界
    clear pending
```

**P0-2 关键**：offset 在 `on_flush` 成功**之后**才提交。`BatchGroup.max_offset_per_partition` 保证 `(topic, partition)` 维度上不重复提交更早的 offset。

**P0-7 关键**：`_run_with_reconnect` 包装消费循环，捕获异常后指数退避重连；`_shutdown_event` 同时充当 cancel 信号。

**优雅关闭顺序**（由 `app.py` 触发 SIGTERM）：
1. SIGTERM → `_shutdown()` 设 `_running = False`、`_shutdown_event.set()`
2. `_consume` 的 `async for` 退出
3. `finally` 块 `consumer.stop()`
4. `_run_with_reconnect` 退出循环
5. `_final_drain` → `accumulator.stop()` 排空 → `_commit_pending` 最后一次提交

---

### 3.10 `adapters/`

**接口**（`adapters/base.py`）：

```python
class BaseAdapter(ABC):
    def batch_insert(storage, helper, rows) -> int
    def batch_upsert(storage, helper, rows, pk_columns) -> int

def get_adapter(data_source_type: DataSourceType) -> BaseAdapter
```

**注册表**（`get_adapter`）：
- `POSTGRESQL` → `PostgresAdapter`
- `MYSQL` → `MySQLAdapter`
- 其他（含 `None`） → `GenericAdapter`

#### 3.10.1 `PostgresAdapter`

| 方法 | 关键 SQL |
|---|---|
| `batch_insert` | `COPY "t" (cols) FROM STDIN WITH (FORMAT csv, DELIMITER E'\t', NULL '\N', ESCAPE '\\')` |
| `batch_upsert` | `CREATE TEMP TABLE "_stg_t_xxx" (LIKE "t" INCLUDING DEFAULTS)` → COPY → `INSERT INTO "t" SELECT ... FROM "_stg_..." ON CONFLICT (pk) DO UPDATE SET <non-pk> = EXCLUDED.<non-pk>` → `DROP TABLE` |

**`_csv_value` 类型映射**（`adapters/postgres.py:104-117`）：
- `None → '\N'`
- `bool → 't'/'f'`
- `date/datetime → isoformat()`
- `Decimal → str(val)`
- `bytes → '\\x<hex>'`
- 其他 → `str(val)`

#### 3.10.2 `MySQLAdapter`

- `MAX_BATCH = 1000`：每批最多 1000 行（MySQL `max_allowed_packet` 限制）
- `batch_insert`：分块执行多行 `INSERT INTO ... VALUES (...), (...), ...`
- `batch_upsert`：分块执行 `INSERT ... ON DUPLICATE KEY UPDATE col=VALUES(col)`
- **P0-6 关键**：所有 chunk 共享一个连接，循环结束统一 `commit()`，异常 `rollback()`，`finally` 中 `close()`

#### 3.10.3 `GenericAdapter`（降级）

- `batch_insert`：调 `storage.insert_all`
- `batch_upsert`：逐行 `update_one`（按主键），0 行时 `insert_one` 兜底
- 性能最差，但适用于所有 `TopicDataStorageSPI` 实现

---

### 3.11 `monitor.py` — Prometheus 指标

| 指标 | 类型 | 标签 | 位置 |
|---|---|---|---|
| `MESSAGES_CONSUMED` | Counter | `table` | `monitor.py:10` |
| `ROWS_WRITTEN` | Counter | `table`, `op` | `monitor.py:16` |
| `WRITE_ERRORS` | Counter | `table` | `monitor.py:22` |
| `BATCH_FLUSH_DURATION` | Histogram | `table` | `monitor.py:28` |
| `BUFFER_SIZE` | Gauge | `table` | `monitor.py:34` |
| `CONSUMER_LAG` | Gauge | `topic` | `monitor.py:40` |

`start_prometheus_server()` 用 `prometheus_client.start_http_server` 起 HTTP server 暴露 `/metrics`。

> **注意**：当前 `CONSUMER_LAG` 的标签只有 `topic`，没有 `partition`（与 `docs/DESIGN.md § 8.1` 略有差异）。多 partition 时只能看到 topic 级别累加值。

---

### 3.12 `health.py` — 健康检查

```python
class HealthState:
    snapshot() -> {
        status: 'ok' | 'degraded',
        consumer_connected: bool,
        buffers: {table: size}
    }

def start_health_server(state, port) -> ThreadingHTTPServer
```

**端点**：
- `GET /health` → 200/503 + JSON
- `GET /` → 200 + 简单介绍

**注意**：
- 使用 `ThreadingHTTPServer` 跑在独立线程（通过 `loop.run_in_executor`）
- 状态数据来自 `Accumulator._groups`（**非线程安全**），健康检查线程读它时 consumer 线程可能正在改写
- 单消费者实例下风险低；多线程改造时需加锁

---

### 3.13 `retry.py`

```python
async def retry_async(operation, max_retries, delay_seconds, op_name) -> T:
    for attempt in 1..max_retries:
        try: return await operation()
        except: if last: raise; else await sleep(delay)
```

**被谁调用**：
- `consumer.py:_write_with_retry` — 包 `BatchWriter.write_batch`
- P0-3 的修复点；maxRetries 来自 settings

---

### 3.14 `app.py` — 启动入口

```
run():
    _init_settings()                 # 把环境变量映射到 settings
    logger.info startup
    start_prometheus_server()        # 暴露 /metrics
    principal = _get_principal_service()  # PAT 认证；缺失/失败 → fail-fast
    config_resolver = ConfigResolver(principal)
    _preload_configs(config_resolver) # 预热（preloadTableNames）
    writer = BatchWriter()
    consumer = KafkaConsumer(config_resolver, writer)
    health_state = HealthState(consumer=consumer)
    start_health_server(health_state, settings.healthPort)
    await consumer.start()            # 阻塞直到 SIGTERM
```

**`_get_principal_service` 行为**（P2-15）：
- `pat` 未设置 → `RuntimeError("PAT 未配置...")` 退出（**拒绝** super-admin 降级）
- `pat` 设置但认证失败 → `RuntimeError("PAT 认证失败...")` 退出
- 成功 → 返回 principal

**`_init_settings` 表驱动**（P2-17）：
环境变量 → 字段 + 类型转换集中在 `_ENV_BINDINGS`，加新配置只需追加一行。

---

## 4. 扩展点指南

### 4.1 新增一种数据库

1. 在 `adapters/` 下新建 `xxx.py`，继承 `BaseAdapter`
2. 实现 `batch_insert` / `batch_upsert`
3. 在 `adapters/base.py:get_adapter` 注册 `DataSourceType.XXX`
4. `__init__.py` 增加导出（如需）
5. （可选）`pyproject.toml` 增加 `watchmen-storage-xxx` extra
6. 添加测试 `tests/test_xxx_adapter.py`

### 4.2 新增一种 MappingFactor 处理

当前 `_build_field_map` 只处理 `kind='topic'` 的 source；`kind='constant'` / `kind='computed'` 被静默忽略。

如要支持：
- 修改 `_build_field_map` 接受 `constants: Dict[factor_id, Any]`
- 在 writer 端：constant 直接 `row[ods_name] = const_value`
- computed 需实现 `ParameterComputeType` 的语义（year-of / case-then 等），参考 `pipeline_kernel` 中的实现

### 4.3 支持多 ODS 目标（fan-out）

当前 `_pick_best_target` 只选一个 ODS 目标，其余的 mapping 被丢弃。

如要支持：
- `ResolvedConfig.ods_topic` 改成 `List[ResolvedTarget]`
- writer 按 op 路由时**对每个 ODS 目标各执行一次** adapter 调用
- `BatchGroup` 需要携带 `ods_topics` 信息（目前用 `config.ods_topic` 单值）

### 4.4 调整 PK 查找策略

`_find_pk_columns` 走 `FactorIndexGroup.UNIQUE_INDEX_*`，缺省 `id_`。

如要支持 composite PK 或非 `u-` 前缀：
- 修改 `_is_unique_index_group` 的判断
- 或在 CollectorTableConfig 上读取 `primaryKey` 字段（`collector_table_config.py:81`）

### 4.5 增加新的 Kafka topic 处理

`ConfigResolver.resolve` 是惰性的：第一次遇到 table 时解析；后续命中缓存。

`ConfigResolver.preload(table_names, tenant)` 可在启动时**预热**，避免首批消息延迟。

### 4.6 修改 offset 提交粒度

当前以 `(topic, partition)` 维度提交 `(max_offset + 1)`。

如要改为"按 group 提交"或"事务化提交"：
- `consumer.py:_handle_flush_results` 改为按 group 收集
- `BatchGroup` 需要保存 partition_offsets 信息（在 `FlushResult` 已经做了）

---

## 5. 已知问题与 TODO

| # | 位置 | 问题 | 影响 |
|---|---|---|---|
| 1 | ~~`config_resolver.py:_resolve_ods_mapping` 之后~~ | ✅ **已修复**：`_do_resolve` 现在同时构造 `ods_storage` / `ods_entity_helper` / `ods_pk_columns` 三个 ODS 上下文字段；writer 改为可用 `config.ods_storage` 写 ODS 表 | — |
| 2 | `monitor.py:CONSUMER_LAG` | 标签只有 `topic`，没有 `partition` | 多 partition 时 lag 不可见 |
| 3 | `health.py:HealthState.snapshot` | 直接读 `Accumulator._groups`，未加锁 | 与 `add_many` 竞争可能数据不一致（低风险） |
| 4 | `config_resolver.py` 多 ODS 选择（legacy 路径） | 只选 mapping 数最多的 target，其余 ODS 不写 | legacy 路径 fan-out 场景丢数据；**pipeline-runner 路径天然支持 fan-out**（per-topic buffer） |
| 5 | `consumer.py:_run_with_reconnect` | 重连退避不持久化 | 重启后从 0 退避重试（无影响） |
| 6 | `writer.py:_mark_soft_delete` | 直接修改 serialized row；依赖 adapter 的 EXCLUDED/VALUES 语义 | 若换成纯 `INSERT ... ON CONFLICT DO UPDATE SET a=?, b=?` 形式会覆盖非 PK 列 |
| 7 | `adapters/generic.py` | 逐行 upsert 无重试 | 降级路径性能差但功能正常 |
| 8 | `batch_pipeline_runner.py:_patch_ask_topic_data_service` | 用 monkey-patch 拦截全局工厂函数 | 并发场景下不安全（当前 batch-writer 串行处理 batch，安全）；上游有 `TopicStorages.ask_topic_data_service` 扩展后应改为接口 override（见设计文档 §3.3.2） |
| 9 | `batch_pipeline_runner.py` | 编译 pipeline 不复用 `CacheService.compiled_pipeline()` | 每次冷启动或新表时编译一次；如需跨实例共享，需 pipeline-kernel 暴露 `ask_compiled_pipeline` 工厂 |
| 10 | `batch_pipeline_runner.py:_run_one` | 调 `pipeline.run()` 同步；阻塞 event loop | 单批 CDC row 过多时延迟其他 batch；当前 `batchSize=5000` 仍在同步等待范围内；如需更平滑可改 `asyncio.to_thread` |
| 11 | `write_buffering_data_service.py` | helper 赋值逻辑复制自 `TopicDataService.insert` | 上游改动时需同步；建议上游把 helper 赋值提取为 `_prepare_insert_data` 公开方法 |

---

## 6. 关键测试

完整测试在两个隔离测试文件中（不依赖 MySQL / Kafka，可直接跑）：

```bash
# 已有测试（18 个）
poetry run python /tmp/test_batch_writer_isolated.py

# 新增 pipeline-runner 测试（13 个）
poetry run python /tmp/test_pipeline_runner.py
```

**`test_batch_writer_isolated.py`**（18 个测试）覆盖：
- CDC 解析（5 个）
- BatchGroup offset 聚合 + 二级排序
- retry_async 成功/失败
- Accumulator batch add + 失败回填
- Postgres COPY `_csv_value` 各类值
- MySQL chunks
- Adapter factory 分发
- **`_collect_mappings_by_target` 多 pipeline 合并**
- **`_collect_mappings_by_target` 跳过 disabled / 空 mapping**
- **`_pick_best_target` 平局确定性**
- **`_build_field_map` 过滤非常量 kind**

**`test_pipeline_runner.py`**（13 个测试）覆盖：
- `usePipelineRunner` feature flag 默认 False
- `WriteBufferingTopicDataService.insert` 触发 helper 赋值 + buffer 增长
- `WriteBufferingTopicDataService.flush` 调 `storage.batch_insert` + buffer 清空
- `WriteBufferingTopicDataService.update_by_id_and_version` 触发 version 递增 + buffer 增长
- `WriteBufferingTopicDataService.reset` 清空两个 buffer
- `BatchPipelineTopicStorages` 懒构造 buffer + 单例
- `BatchPipelineTopicStorages.reset_buffer` 清空
- `BatchPipelineRunner._patch_ask_topic_data_service` 把目标 ODS topic 路由到 buffer，其他 topic 走原 factory
- `BatchWriter.write_batch` 在 flag 开启时调 `BatchPipelineRunner.write_batch`
- `BatchWriter.write_batch` 在 flag 关闭时走 legacy 路径
- `BatchWriter.write_batch` 在 DELETE 时**强制**走 legacy 路径
- `BatchWriter.write_batch` 在 pipeline-runner 异常时回退到 legacy

集成测试需要真实 Kafka + MySQL/PG，未在仓库内提供。

---

## 7. 关键不变式（Invariants）

修改代码前请确保不破坏：

1. **At-least-once 语义**：写入失败时 `on_flush` 抛异常 → `FlushResult.ok=False` → offset **不**提交 → 下次从该 offset 重新消费。
2. **同 group 顺序性**：`sorted_rows()` 按 `(_binlog_id, _seq)` 排序，依赖上游按 `table` 单 partition。
3. **PK 唯一性**：`_find_pk_columns` 至少返回一列（缺省 `id_`），否则 DELETE 软删除无法定位行。
4. **field_map 一致性**：`_build_field_map` 在 writer 中应用；不同 ODS topic 的 field_map 独立（每次 resolve 重新算）。
5. **config cache 生命周期**：与进程一致；K8s 滚动更新触发 reload。
6. **单租户**：每个实例一个 PAT；多租户 = 多实例（与 `docs/DESIGN.md § 11.1` 一致）。

---

## 8. 调试技巧

| 现象 | 排查 |
|---|---|
| 启动后无消息 | 检查 `BATCH_WRITER_TOPICS` / Kafka bootstrap；`KAFKA_AUTO_OFFSET_RESET=earliest` |
| 写库时列不存在 | 看 writer log 中的 column 名（`get_column_names`）；很可能是问题 #1（storage 关联了 raw topic） |
| offset 不前进 | 检查是否在 `flush_all()` 后有失败的 group（re-queue）；日志搜 "Flush failed" |
| 软删覆盖了字段 | 检查 adapter 的 UPSERT 语法是否支持 `EXCLUDED` / `VALUES()`；MySQL 8+ 才支持 `VALUES()` |
| Prometheus 端口冲突 | `prometheusPort` / `healthPort` 改环境变量；当前两端口分别默认 9091/9092 |
| PAT 认证失败 | 启动时直接抛 `RuntimeError`（fail-fast），不会回退到 super-admin |
| 重连风暴 | `reconnectBaseDelaySeconds * 2^attempt` 封顶 `reconnectMaxDelaySeconds`；如需调整改 settings |

---

## 9. 与设计文档的差异

| 设计 | 实际 | 备注 |
|---|---|---|
| `__main__.py` 入口 | `__main__.py` 调 `app.main` | 走 `python -m watchmen_batch_writer` |
| `health.py` 含 `/health` 和 `/metrics` | `/health` 在 `health.py`，`/metrics` 走 `prometheus_client` | 分两端口（9091/9092） |
| `metrics.py` | `monitor.py` | 命名沿用旧实现 |
| 单一 Kafka offset commit | per `(topic, partition)` max+1 | 更细粒度 |
| 一条消息一行的 offset 追踪 | 整个 group 取 max offset per partition | 减少 commit 次数 |
| 重试默认 3 次 | 同 | 来自 `MAX_RETRIES` 环境变量 |
| `enableAutoCommit` | 强制 False | 实现里不读这个开关（见 6.1 的修复点） |
| **`WriteBufferingTopicDataService` 在 `watchmen-data-kernel` 并继承 `TopicDataService`** | **本地独立包装类（不继承）** | 见 §3.6 设计偏离 |
| **`BatchPipelineTopicStorages` 扩展 `TopicStorages` 接口的 `ask_topic_data_service`** | **monkey-patch 全局 `service_helper.ask_topic_data_service`** | 见 §3.7 设计偏离 |
| **`BatchPipelineRunner` 接受 `soft_delete_flag` 参数** | **不接收** | DELETE 强制走 legacy 软删除路径（pipeline 的 `CompiledDeleteRowAction` 是物理删除） |
| **`RuntimeCompiledPipeline.run(new_pipeline=noop_queue)`** | **不传 `new_pipeline` 参数** | `CreateQueuePipeline` 是 `Callable` 不是 class，且 `run()` 签名不接受；级联通过丢弃 `run()` 返回的 `QueuedPipelineContexts` 实现 |

---

## 10. 维护建议

- **新增 metric**：在 `monitor.py` 集中加，避免散落
- **新增 adapter**：保持与现有 `PostgresAdapter` 同样的命名（`_copy_csv` / `_execute` / `_chunks`）
- **修改 config_resolver**：任何 `_do_resolve` 的改动都要更新 `/tmp/test_batch_writer_isolated.py` 中 `_collect_mappings_*` 系列测试
- **修改 accumulator**：注意 `_total_count` 在 add / flush / requeue 三处的语义
- **修改 consumer**：offset 提交路径涉及 `_handle_flush_results` + `_commit_pending` 两处，确保失败路径不会 commit
