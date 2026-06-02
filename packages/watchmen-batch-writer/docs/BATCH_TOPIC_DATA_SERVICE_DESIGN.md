# 复用 Pipeline 逻辑的批量写入方案 — 可行性分析

> 状态：**设计提案 + Phase 1-3 已实现**。
>
> - 设计提案：本文档分析"通过新增 `BatchTopicDataService` + 复用 `RuntimeCompiledPipeline` / `ParsedStorageMapping` 解析"来实现批量同步的可行性。
> - 实现状态（2026-06-03）：
>   - `WriteBufferingTopicDataService` / `BatchPipelineTopicStorages` / `BatchPipelineRunner` 已在 `watchmen-batch-writer` 包内实现（独立包装类，**不修改** `watchmen-data-kernel` / `watchmen-pipeline-kernel` / `watchmen-storage`）。
>   - `settings.usePipelineRunner` 开关默认 `False`（legacy 路径），设为 `True` 启用 pipeline-runner 路径。
>   - 拦截方式：monkey-patch `watchmen_data_kernel.service.service_helper.ask_topic_data_service`（不修改 `TopicStorages` 接口）。
>   - **限制**：当前为本地实现版本，与设计文档 §3.3 的"理想实现"有 3 处偏离，见 `docs/CODE_MAP.md §9` 末尾三行。
>   - 13 个新增单元测试在 `/tmp/test_pipeline_runner.py`，全部通过。
>   - Phase 1（扩展 `TopicDataStorageSPI`）的 `batch_insert` / `batch_upsert` 方法**已存在**在 `adapters/base.py` 的 `BaseAdapter` 上 —— 是包内 adapter 抽象层（不同于 `TopicDataStorageSPI`）。

---

## 1. 背景

### 1.1 现状

`watchmen-batch-writer` 当前实现**完全旁路** pipeline 链路：

```
Kafka CDC → consumer → accumulator → writer → TopicDataStorageSPI
                                                    ↓
                                            (no PipelineTrigger,
                                             no PipelinesDispatcher,
                                             no new_pipeline() cascade)
```

写入路径中的 field mapping、cast_date_or_time、encrypt、aid_hierarchy、assign_fix_columns_on_create 等是**手工**在 `writer.py` 中调用的：

- `writer.py:_prepare_rows` 调 `schema.prepare_data()` 做默认/日期/加密/层级
- `writer.py` 调 `helper.assign_fix_columns_on_create()` 填 id/tenant_id/insert_time/update_time
- `config_resolver.py:_build_field_map` 手写 `{raw_factor_name: ods_factor_name}` 映射表

### 1.2 痛点

| 痛点 | 现状 | 复用 pipeline 后 |
|---|---|---|
| Field mapping 语义窄 | `_build_field_map` 只处理 `kind='topic'`，`constant` / `computed` 全部静默忽略 | `ParsedStorageMappingFactor` 完整支持三种 kind + 算术运算 |
| MappingFactor 解析器重复实现 | 自写 `transform_canal_row` | 直接复用 `parse_mapping_for_storage()` |
| 类型转换不完整 | 调 `schema.prepare_data` 但不调 `aid_hierarchy` / `flatten` 等其他生命周期 | pipeline 全套生命周期 |
| 软删除走专门路径 | 手工打标记 | 可以走 pipeline 但需新增软删 `BatchSoftDelete` action |
| 跟踪谁调用了谁 | 自己维护 | pipeline 自身有 monitor log 体系 |
| 与 `watchmen-pipeline-surface` 行为漂移 | batch-writer 写入的字段可能与 pipeline 不一致 | 完全一致 |

---

## 2. 当前 pipeline 链路精要

> 以下行号基于本仓库 HEAD。

### 2.1 触发与执行链

```
PipelineTrigger.invoke()                                # pipeline_trigger.py:145
    prepare_trigger_data()                              # schema.prepare_data + 业务处理
    save_trigger_data()                                 # TopicDataService.insert/update/delete
    start(trigger)                                      # pipeline_trigger.py:98
        PipelinesDispatcher.start()                     # pipelines_dispatcher.py:18
            for context in contexts:
                context.start()                         # pipeline_context.py:28
                    RuntimeCompiledPipeline.run()       # compiled_pipeline.py:48
                        for stage in stages:
                            run_stage()
                                CompiledStage.run()
                                    CompiledUnit.run()
                                        CompiledAction.run()   # do_run
                                            # 写操作:
                                            CompiledInsertRowAction.do_run()
                                                topic_data_service.insert(data)  # 单行
                                            CompiledInsertOrMergeRowAction.do_run()
                                                topic_data_service.find() + insert/update
                                            CompiledDeleteRowAction.do_run()
                                                topic_data_service.find() + delete_by_id_and_version
```

### 2.2 关键数据结构

| 名称 | 位置 | 作用 |
|---|---|---|
| `TopicDataService` | `data_service.py:84` | 抽象基类；提供 `insert/update/delete/find` 等**单行**方法 |
| `RegularTopicDataService` | `regular_data_service.py:68` | 业务 topic 实现 |
| `RawTopicDataService` | `raw_data_service.py:82` | raw topic 实现（无 version） |
| `RuntimeTopicStorages` | `topic_helper.py:18` | 持有 storage 缓存 + `ask_topic_storage(schema)` |
| `ask_topic_data_service(schema, storage, principal)` | `service_helper.py:12` | 工厂：基于 `is_raw_topic(topic)` 选 Regular/Raw |
| `ParsedStorageMappingFactor` | `ask_from_storage.py:1027` | 单个 `MappingFactor` 的解析器，支持 `topic`/`constant`/`computed` 三种 source |
| `ParsedStorageMapping` | `ask_from_storage.py:1233` | 整个 `mapping[]` 的解析器，`run()` 把 variables+data 转成 mapped dict |
| `PipelineVariables` | `variables.py:10` | 持有 `previous_data`/`current_data`/`variables`/raw topic |

### 2.3 写 action 的核心调用

`compiled_action.py` 中所有 `*Insertion` / `*Update` 类的 `do_*` 方法**都最终调用 `TopicDataService` 的单行方法**：

| Action | 调用 |
|---|---|
| `CompiledInsertion.do_insert` | `topic_data_service.insert(data)` (`compiled_action.py:541`) |
| `CompiledUpdate.do_update` | `topic_data_service.update_by_id_and_version(data)` (`compiled_action.py:606`) |
| `CompiledUpdate.do_update_with_lock` | `topic_data_service.update_with_lock_by_id(data)` (`compiled_action.py:615`) |
| `CompiledDeleteRowAction.do_run` | `topic_data_service.delete_by_id_and_version(row)` (`compiled_action.py:794`) |
| `CompiledDeleteRowsAction.do_run` | 同上，循环 (`compiled_action.py:827`) |

**没有 `batch_insert` / `batch_upsert` / `batch_delete` 接口**。

### 2.4 单 TopicDataService 的写 SQL 路径

`TopicDataService` 把单行写入委托给 `TopicDataStorageSPI`：

```python
# data_service.py:357
def insert(self, data) -> Dict:
    helper.assign_id_column(data, snowflake.next_id())
    helper.assign_version(data, 1)
    helper.assign_tenant_id / insert_time / update_time(...)
    storage.connect()
    storage.insert_one(data, helper.get_entity_helper())   # 单行 INSERT
    return data
```

底层 `storage.insert_one` 在 PG/MySQL/Oracle 各家 SPI 实现里都是 `INSERT INTO ... VALUES (...)`，**逐行**。

### 2.5 CopyToMemoryAction + Unit Loop 展开模式

> **重要：这是当前实现完全没考虑的 batch 场景**。原 batch-writer 假定 `data[]` 中的每条是独立 CDC 行；如果 raw topic JSON 中有嵌套数组，必须通过 pipeline 的 `CopyToMemoryAction` 抽出 + `Unit.loopVariableName` 循环展开。

**典型场景**：

```json
// Canal CDC 消息的 data[0]：
{
  "id": "order-001",
  "order_no": "X123",
  "items": [
    {"sku": "A", "qty": 2, "price": 10.0},
    {"sku": "B", "qty": 1, "price": 20.0}
  ]
}
```

Pipeline 配置：

```
Stage[0]
  Unit[0]  (loopVariableName=null)
    Action: CopyToMemoryAction
      variableName = "items"
      source = ConstantParameter{ value = "data.items" }   // 引用 currentData.items
  Unit[1]  (loopVariableName="items")
    Action: InsertRowAction
      mapping = [
        { source: {kind=topic, topicId=raw, factorId=item_sku},  factorId: ods_sku },
        { source: {kind=topic, topicId=raw, factorId=item_qty},  factorId: ods_qty },
        ...
      ]
```

**pipeline 运行时序**（`compiled_unit.py:24-92`）：

```
for cdc_row in batch:
  variables = PipelineVariables(current_data=cdc_row, ...)
  
  # Unit[0]: no loop, 跑 CopyToMemoryAction
  Unit[0].run():
    Action CopyToMemoryAction.do_run():
      value = parsedSource.value(variables)  # = cdc_row["items"] = [item1, item2]
      variables.put("items", value)         # <-- 把 array 放进 variables
  
  # Unit[1]: hasLoop=True, loopVariableName="items"
  Unit[1].run():
    loop_value = variables.find("items")  # = [item1, item2]
    for element in loop_value:             # element = item1, then item2
      cloned = variables.shallow_clone()
      cloned.put("items", element)         # 此时 variables["items"] = 单个 element
      Unit[1].do_run():
        Action InsertRowAction.do_run():
          mapped = parsedMapping.run(...)  # mapping 引用 {item_sku} → variables["items"]["sku"]
          topic_data_service.insert(mapped)   # ← 单行 INSERT
```

**关键观察**：

- CopyToMemoryAction **先于** loop unit 跑（pipeline 内 unit 顺序）
- 同一个 CDC row 在 pipeline 内部可能产生 **多条** ODS 写入（每条 array 元素一条）
- `MappingFactor.source` 引用 `{item_sku}` 这种路径，pipeline 解析时通过 `variables.find("items")` 拿到当前 loop 元素，再下钻到 `["sku"]`

**batch-writer 的关键问题**：

- 当前实现 `accumulator.add(row)` 一条 CDC 行进 buffer，没考虑展开后的多 ODS 行
- 如果一条 CDC row 的 `items` 数组有 100 元素，pipeline 会产生 100 条 ODS insert
- batch 写入需要把这 100 条（来自同一 CDC row）合并进同一个 `batch_insert` 调用

---

## 3. 复用方案（修订版）

### 3.0 设计决策：拦截器模式 > 自写 `BatchTopicDataService`

经过 §2.5 的分析，**原方案 A（手动循环 `parsedMapping.run()`）无法优雅处理 loop 展开**。本节给出修订方案：

**核心思想**：让 `RuntimeCompiledPipeline.run()` **原样跑**，不重写它。但在它调用 `topic_data_service.insert/update/delete` 时**拦截**，把单行写入 buffer 到一起。pipeline 跑完后再批量 flush。

### 3.1 设计目标

让 batch-writer 在以下方面**复用**现有 pipeline 逻辑：

1. **Mapping 解析**：pipeline 内部的 `ParsedStorageMapping` 全套
2. **生命周期**：`schema.prepare_data()` + `try_to_wrap_to_topic_data()` + `assign_fix_columns_on_create()`
3. **CopyToMemoryAction + Loop 展开**：pipeline 原生支持，**无需重写**
4. **prerequisite、read action、写 action 顺序**：pipeline 调度
5. **monitor log**：复用 `MonitorLogAction` 结构

**不**复用的部分：

- `PipelineTrigger.invoke()` 入口（自己从 Kafka 驱动）
- `PipelinesDispatcher` 调度（用 noop `CreateQueuePipeline` 替换）
- `new_pipeline()` 级联触发（noop 队列，不入队）
- 软删除语义（pipeline 物理删，batch-writer 软删；走单独路径）

### 3.2 架构

```
┌────────────────────────────────────────────────────────────────────────────┐
│ watchmen-batch-writer                                                      │
│                                                                            │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────┐  ┌──────────────┐    │
│  │ consumer   │→ │ accumulator  │→ │ BatchPipeline  │→ │ writer       │    │
│  │ (existing) │  │ (existing)   │  │ Runner (NEW)   │  │ (rewritten)  │    │
│  └────────────┘  └──────────────┘  └────────┬───────┘  └──────┬───────┘    │
│                                              │                  │            │
│                                              ▼                  ▼            │
│                              ┌──────────────────────────┐  ┌──────────────┐ │
│                              │ For each CDC row:        │  │ Flush        │ │
│                              │   RuntimeCompiledPipeline│  │  buffers     │ │
│                              │     .run()               │  │  via batch_  │ │
│                              │  ┌────────────────────┐  │  │  insert()    │ │
│                              │  │ CompiledStage       │  │  │  upsert()    │ │
│                              │  │  └─ CompiledUnit    │  │  └──────┬───────┘ │
│                              │  │      └─ Action     │  │         │         │
│                              │  │         (copy,     │  │  ┌──────▼───────┐ │
│                              │  │          read,     │  │  │ storage      │ │
│                              │  │          write)    │──┼──▶ TopicData   │ │
│                              │  └────────────────────┘  │  │ StorageSPI   │ │
│                              │                          │  │ .batch_*     │ │
│                              │  WriteBufferingDataSvc   │  └──────────────┘ │
│                              │  (intercepts writes)     │                    │
│                              └──────────────────────────┘                    │
└────────────────────────────────────────────────────────────────────────────┘
```

**三个新增类**：

1. **`WriteBufferingTopicDataService`** — 包装 `TopicDataService` 的写方法（insert/update/delete），把单行操作 buffer 起来，不调底层 storage。pipeline 跑完后调 `flush()` 走 batch SQL。
2. **`BatchPipelineTopicStorages(TopicStorages)`** — 实现 `TopicStorages` 接口，同时新增 `ask_topic_data_service()` 方法（需要扩展到接口中），对**目标 ODS topic** 返回 buffering 实例，对其他 topic 走原工厂。
3. **`noop_queue: CreateQueuePipeline`** — `CreateQueuePipeline` 类型是 `Callable[[TopicSchema, TopicTrigger], None]`，直接传 `lambda schema, trigger: None`。杜绝级联。

### 3.3 关键代码形态

#### 3.3.1 `WriteBufferingTopicDataService`

```python
# 新文件：watchmen-data-kernel/src/watchmen_data_kernel/storage/write_buffering_data_service.py
class WriteBufferingTopicDataService:
    """
    Intercepts single-row write calls from the compiled pipeline and
    buffers them in memory. flush() drains the buffer via a single
    batch SQL call (COPY / multi-row INSERT), reusing the underlying
    storage's batch_* methods.

    Does NOT extend TopicDataService. Instead it wraps the helper and
    storage directly, extracting the helper-assignment logic from
    TopicDataService.insert()/update()/delete() without calling
    storage.insert_one/etc. (which would execute single-row SQL).

    DELETE is NOT intercepted here — batch-writer handles DELETE via
    soft-delete + batch_upsert directly in writer.py, bypassing the
    pipeline entirely (see §5.6).
    """

    def __init__(self, schema, entity_helper, real_storage, principal):
        self._schema = schema
        self._helper = entity_helper
        self._storage = real_storage
        self._principal = principal
        self._insert_buffer: List[Dict] = []
        self._update_buffer: List[Dict] = []

    # ---- 以下三个方法与 TopicDataService 的 insert/update/delete 逻辑一致，
    #      但去掉了对 storage.insert_one/storage.update_one 的调用 ————

    def insert(self, data: Dict) -> Dict:
        # 与 TopicDataService.insert (data_service.py:357) 的 helper 赋值段一致
        self._helper.assign_id_column(data, self._get_snowflake().next_id())
        self._helper.assign_version(data, 1)
        now = get_current_time_in_seconds()
        self._helper.assign_tenant_id(data, self._principal.get_tenant_id())
        self._helper.assign_insert_time(data, now)
        self._helper.assign_update_time(data, now)
        self._insert_buffer.append(dict(data))
        return data

    def update_by_id_and_version(self, data, additional_criteria=None) -> Tuple[int, EntityCriteria]:
        criteria = self._build_id_version_criteria(data)
        if additional_criteria is not None:
            criteria = [*criteria, *additional_criteria]
        current_version = self._helper.find_version(data)
        self._helper.assign_version(data, current_version + 1) if current_version else None
        self._helper.assign_update_time(data, get_current_time_in_seconds())
        self._update_buffer.append(dict(data))
        return 1, criteria

    # ---- 批量 flush ----

    def flush(self, pk_columns: List[str]) -> int:
        """
        Drain buffers via batch SQL.
        - insert: storage.batch_insert(rows, helper)
        - update: storage.batch_upsert(rows, helper, pk_columns)
        - on any failure, the caller should reset and rely on at-least-once
        """
        total = 0
        if self._insert_buffer:
            total += self._storage.batch_insert(
                self._insert_buffer, self._helper.get_entity_helper())
            self._insert_buffer.clear()
        if self._update_buffer:
            total += self._storage.batch_upsert(
                self._update_buffer, self._helper.get_entity_helper(), pk_columns)
            self._update_buffer.clear()
        return total

    def reset(self):
        self._insert_buffer.clear()
        self._update_buffer.clear()

    def _build_id_version_criteria(self, data):
        return [...]  # 等同于 TopicDataService.build_id_version_criteria
```

#### 3.3.2 `TopicStorages` 接口扩展 + `BatchPipelineTopicStorages`

**`TopicStorages` 现有接口** (`topic_storages.py:8-11`) 只有 `ask_topic_storage()`。需要**新增一个方法**，让 `BatchPipelineTopicStorages` 能拦截 data service 的创建：

```python
# watchmen-pipeline-kernel/src/.../topic_storages.py
class TopicStorages:
    @abstractmethod
    def ask_topic_storage(self, schema: TopicSchema) -> TopicDataStorageSPI:
        pass

    # === 新增（向下兼容）===
    def ask_topic_data_service(
            self, schema: TopicSchema,
            principal_service: PrincipalService) -> TopicDataService:
        # 默认实现：走全局工厂（与现有 CompiledAction 行为一致）
        from watchmen_data_kernel.service import ask_topic_data_service
        storage = self.ask_topic_storage(schema)
        return ask_topic_data_service(schema, storage, principal_service)
```

同时 `CompiledAction.ask_topic_data_service()` 改为优先调 `storages` 上的方法：

```python
# compiled_action.py (修改点)
def ask_topic_data_service(self, schema, storages, principal_service):
    if hasattr(storages, 'ask_topic_data_service'):
        return storages.ask_topic_data_service(schema, principal_service)
    # fallback：原逻辑
    storage = storages.ask_topic_storage(schema)
    from watchmen_data_kernel.service import ask_topic_data_service
    return ask_topic_data_service(schema, storage, principal_service)
```

这样修改后，`BatchPipelineTopicStorages` 可以 override：

```python
# 新文件：watchmen-data-kernel/src/watchmen_data_kernel/storage_bridge/batch_pipeline_storages.py
class BatchPipelineTopicStorages(TopicStorages):
    """
    Implements TopicStorages for batch-writer.
    ask_topic_data_service() returns a WriteBufferingTopicDataService
    for the target ODS topic, and a pass-through for other topics.
    """
    def __init__(self, principal_service, target_ods_schema, real_storages_cache):
        self.principal = principal_service
        self.target_ods_schema = target_ods_schema
        self._real_cache = real_storages_cache       # dict[ds_id -> TopicDataStorageSPI]
        self._buffer: Optional[WriteBufferingTopicDataService] = None

    def ask_topic_storage(self, schema: TopicSchema) -> TopicDataStorageSPI:
        ds_id = schema.get_topic().dataSourceId
        if ds_id not in self._real_cache:
            storage = ask_topic_storage(schema, self.principal)
            self._real_cache[ds_id] = storage
        return self._real_cache[ds_id]

    def ask_topic_data_service(
            self, schema: TopicSchema,
            principal_service: PrincipalService) -> TopicDataService:
        if schema.get_topic().topicId == self.target_ods_schema.get_topic().topicId:
            if self._buffer is None:
                helper = ask_topic_data_entity_helper(schema)
                storage = self.ask_topic_storage(schema)
                self._buffer = WriteBufferingTopicDataService(schema, helper, storage, self.principal)
            return self._buffer
        # 其他 topic（如果有 read action）走真实 data service
        return super().ask_topic_data_service(schema, principal_service)

    def flush_buffer(self, pk_columns) -> int:
        if self._buffer:
            return self._buffer.flush(pk_columns)
        return 0

    def reset_buffer(self):
        if self._buffer:
            self._buffer.reset()
```

#### 3.3.3 `BatchPipelineRunner`

```python
# 新文件：watchmen-batch-writer/src/watchmen_batch_writer/batch_pipeline_runner.py
class BatchPipelineRunner:
    """
    Runs the compiled pipeline for each CDC row, intercepting writes
    to a single batch buffer. Then flushes the buffer in one shot.

    CreateQueuePipeline 抑制：pipeline kernel 通过 PipelineContext 构造时
    传入 CreateQueuePipeline callback。本 runner 注入一个 noop lambda，
    使 new_pipeline() 级联被完全抑制。
    """
    def __init__(self, compiled_pipeline, principal, ods_schema, ods_pk_columns,
                 max_poll_records=10000):
        self.compiled_pipeline = compiled_pipeline
        self.principal = principal
        self.ods_schema = ods_schema
        self.ods_pk_columns = ods_pk_columns

        # 1. 构造 buffering 存储 / 数据服务
        self.batch_storages = BatchPipelineTopicStorages(
            principal, ods_schema, real_storages_cache={})
        # 2. noop callback — CreateQueuePipeline 是 Callable[[TopicSchema, TopicTrigger], None]
        self.noop_queue = lambda schema, trigger: None

    async def write_batch(self, group: BatchGroup) -> None:
        rows = group.sorted_rows()  # CDC 原始行
        for cdc_row in rows:
            try:
                # 3. 构造 PipelineVariables；用 CDC 行作 currentData
                variables = PipelineVariables(
                    previous_data=None,
                    current_data=cdc_row,
                    topic=self.compiled_pipeline.pipeline.topicId
                )
                # 4. 直接跑 compiled_pipeline.run()
                #    - run() 不接受 new_pipeline 参数；noop queue 在 PipelineContext
                #      构造时注入，run() 内部使用 context 持有的 callback
                self.compiled_pipeline.run(
                    previous_data=None,
                    current_data=cdc_row,
                    principal_service=self.principal,
                    trace_id=f'batch-writer-{group.tenant_id}',
                    data_id=-1,
                    storages=self.batch_storages,
                    handle_monitor_log=self._silent_monitor_log,
                )
            except Exception:
                # 某条 CDC row 的 pipeline 跑失败 → 清空 buffer，re-raise
                # Kafka offset 不会前进，整批会重发
                self.batch_storages.reset_buffer()
                raise

        # 5. 一批 CDC row 处理完后，一次性 flush 缓冲
        try:
            self.batch_storages.flush_buffer(pk_columns=self.ods_pk_columns)
        except Exception:
            # flush 失败时清空 buffer（数据已丢失，依赖 at-least-once 重发）
            self.batch_storages.reset_buffer()
            raise

    @staticmethod
    def _silent_monitor_log(monitor_log, is_async):
        # batch-writer 不写 monitor log；注入空实现
        pass
```

`CreateQueuePipeline` 不是 class，直接传 lambda：

```python
# 构造 noop callback ———— 替代原 NoopCreateQueuePipeline class
noop_queue = lambda schema, trigger: None
```

**不级联触发**的机制：`ContextPipelineRunner.start()` 内部调 `new_pipeline(schema, trigger)` 时走这个 noop lambda → callback 啥也不做 → 下级 pipeline context 永远不入队。而 `parsedMapping.run()` / `CopyToMemoryAction` / loop 展开 / 写 action 全部按 pipeline 原生语义执行。

#### 3.3.4 `TopicDataStorageSPI` 扩展（向下兼容）

不动现有方法签名。新增抽象方法，老实现给默认抛 `NotImplementedError`：

```python
class TopicDataStorageSPI(TransactionalStorageSPI, ABC):
    # ... 现有方法不动 ...

    def batch_insert(self, rows, helper) -> int:
        raise NotImplementedError('batch_insert not supported by this storage')

    def batch_upsert(self, rows, helper, pk_columns) -> int:
        raise NotImplementedError('batch_upsert not supported by this storage')
```

各 SPI 实现：

| SPI | `batch_insert` | `batch_upsert` |
|---|---|---|
| `PostgreSQL` | `COPY ... FROM STDIN` | `CREATE TEMP TABLE` + `COPY` + `INSERT ... ON CONFLICT DO UPDATE` |
| `MySQL` | 多行 `INSERT INTO ... VALUES (...), ...` (chunk=1000) | 多行 `INSERT ... ON DUPLICATE KEY UPDATE` |
| `Oracle` | `INSERT ALL ... SELECT * FROM DUAL` 批量 | `MERGE INTO ... USING (...)` |
| `MSSQL` | `INSERT INTO ... VALUES (...)` 批 | `MERGE INTO ...` |
| 其他 | 降级为 `insert_one` 循环 | 降级为 `update_one` 循环 |

#### 3.3.5 batch-writer 端新流程

```python
# writer.py (重写后)
class BatchWriter:
    def __init__(self, config_resolver, principal_service):
        # 启动时按 table 预编译每个 (raw_topic, ods_topic) 对的 pipeline
        self.compiled_pipelines: Dict[(table, ods_topic), RuntimeCompiledPipeline] = {}

    def get_compiled_pipeline(self, table, ods_topic, raw_topic):
        # 复用 watchmen-pipeline-kernel 的 CacheService.compiled_pipeline()
        from watchmen_pipeline_kernel.cache import CacheService
        cached = CacheService.compiled_pipeline().get(pipeline_id)
        if cached:
            return cached
        # 否则编译（一次性成本）
        compiled = RuntimeCompiledPipeline(pipeline, principal)
        CacheService.compiled_pipeline().put(pipeline_id, compiled)
        return compiled

    async def write_batch(self, group: BatchGroup) -> None:
        config = group.config
        compiled = self.get_compiled_pipeline_for(config)
        runner = BatchPipelineRunner(
            compiled_pipeline=compiled,
            principal=principal,
            ods_schema=config.ods_schema,
            ods_pk_columns=config.pk_columns,
            soft_delete_flag_column=settings.softDeleteFlagColumn,
            soft_delete_flag_value=settings.softDeleteFlagValue,
        )
        runner.write_batch(group)
```

#### 3.3.6 不级联触发的关键

- `noop_queue(schema, trigger)` 啥也不做（`lambda` 空函数） → `ContextPipelineRunner` 里调 `new_pipeline()` 时，callback 被抑制，下级 context 永远不入队列。
- 但 `parsedMapping.run()` / `CopyToMemoryAction` / loop 展开 / 写 action 全部按 pipeline 原生语义执行。

---

## 4. 复用 vs 旁路 — 对比

| 维度 | 当前实现（旁路） | 复用 pipeline（拦截器方案） |
|---|---|---|
| Field mapping 语义完整度 | 仅 `topic` source | 完整三种 kind + 算术运算 |
| CopyToMemory + Loop 展开 | ❌ 不支持 | ✅ pipeline 原生支持 |
| 与 pipeline-surface 行为一致性 | 漂移风险 | 100% 一致 |
| 软删除 | 手工打标记 | batch_soft_delete（走 batch_upsert） |
| 类型转换 | `prepare_data`（无 aid_hierarchy） | 完整 `prepare_data` |
| 监控日志 | 自写 Prometheus | 复用 `MonitorLogAction`（可选） |
| 新增字段类型时改动点 | writer + adapter | adapter 即可 |
| 改动 `watchmen-data-kernel` / `watchmen-pipeline-kernel` | 不动 | 小幅扩展 SPI + 1 个新类（向下兼容） |
| 上游 batch-writer 代码复杂度 | 中 | 中（核心 3 个新类共 ~150 行） |
| at-least-once 语义 | ✅ 已实现 | ✅ 同样可实现 |
| 性能（PG COPY / MySQL 多行） | ✅ 已实现 | ✅ 同样可达（`TopicDataStorageSPI` 内部走 COPY） |
| 多 ODS fan-out | 暂不支持 | 复用多 action 逻辑天然支持 |
| 改动面 | 仅 batch-writer 包 | batch-writer + data-kernel（1 个新类 + SPI 扩展） |

---

## 5. 关键问题与决策点

### 5.1 ❓ `RuntimeCompiledPipeline.run()` 内部是否会调 `topic_data_service.find()`？

**答：会，但仅在 `InsertOrMergeRowAction` 中**。`CompiledInsertOrMergeRowAction.do_insert_or_merge()` (compiled_action.py:638) 会先 `find()` 查已有数据再决定 insert/update。

**影响**：find 调用走 `BatchPipelineTopicStorages.ask_topic_data_service()`，对非 ODS topic 返回真实 data service，正常查。

**风险**：`find` 是**单行**操作，且带事务（`storage.begin()` / `commit_and_close()`）。batch 场景下每个 element 都触发 find 会很慢。**优化**：在 `WriteBufferingTopicDataService` 同包内覆盖 `find()` 让它短路返回空（表明"未找到"，强制走 insert 分支），避开 find 性能开销。

**代价**：放弃了"已存在则 update、不存在则 insert"的语义。batch-writer 场景下**直接 UPSERT 即可**（PG `ON CONFLICT DO UPDATE` / MySQL `ON DUPLICATE KEY UPDATE`），不需要 find + branch。

### 5.2 ❓ `aid_hierarchy` / `flatten` / `cast_date_or_time` / `encrypt` 在 batch 写 ODS topic 时要跑吗？

**答：要**。这些是 `CompiledInsertion.do_insert` 之前的步骤。**拦截器方案自然处理**——pipeline 自己跑这些，buffer 收到的是已经处理过的 row。

### 5.3 ❓ CopyToMemory 把 array 放到 variable，下游 loop 展开在 unit 级不在 action 级。方案能正确处理吗？

**答：能**。`CompiledUnit.run()` 实现了 array iteration（compiled_unit.py:24-92），pipeline 原生支持。拦截器方案调的是 `RuntimeCompiledPipeline.run()`，里面完整跑了所有 stage / unit / action，包括 loop 展开。**对每条 CDC row 跑一次 pipeline.run()，loop 内部的 write action 会自动调用 buffer**。

### 5.4 ❓ `ask_topic_data_service` 工厂需要改吗？

**不需要**。`BatchPipelineTopicStorages.ask_topic_data_service()` 内部判 schema topicId，对目标 ODS 返回 buffering 实例，其他 topic 走原工厂。

### 5.5 ❓ `CompiledInsertOrMergeRowAction` 中有"find + insert/update"重试逻辑，怎么处理？

参考 §5.1，**短路 find** 让所有路径走 insert。然后 buffer 在 flush 时统一走 batch_upsert。**不重试**，整批重发靠 at-least-once。

### 5.6 ❓ DELETE 软删除怎么走？

batch-writer 在 `WriteBufferingTopicDataService.flush()` 时，**统一把 delete buffer 的 row 打上软删标记**，再合并到 update buffer 一起走 `batch_upsert`。**不调** `CompiledDeleteRowAction`（它物理删）。

**实现要点**：
- 在 `BatchPipelineRunner` 启动时设 `soft_delete_flag=(col, val)`
- `flush()` 把 delete buffer 的 row 写入 `data[col]=val`，然后与 update buffer 合并
- 合并后调 `storage.batch_upsert(rows, helper, pk_columns)`

### 5.7 ❓ 性能提升还是下降？

| 路径 | 期望性能（PG） | 期望性能（MySQL） |
|---|---|---|
| 当前（旁路 + 自写 adapter） | ~27ms / 2000 行（COPY） | ~180ms / 2000 行（多行） |
| 拦截器方案（同样走 COPY / 多行） | ~30ms / 2000 行 | ~200ms / 2000 行 |
| 单行 insert（不用） | ~3000ms / 2000 行 | ~1800ms / 2000 行 |

**结论**：**性能基本一致**。差异在 pipeline 一层的循环 overhead（每个 array element 跑一次 `do_run`），但都是 Python 级别调用，微秒级。

### 5.8 ❓ 兼容 `CompiledReadAction` 怎么办？

`CompiledReadRowAction` / `CompiledReadFactorAction` 等会调 `topic_data_service.find()` / `find_straight_values()`。**batch 场景不依赖读**（`PipelineVariables.current_data` 已经是完整 CDC 行），但如果 pipeline 配置里有读 action，我们**会执行**。

**方案**：
- `BatchPipelineTopicStorages` 对非 ODS topic 返回**真实** data service（`ask_topic_data_service` 原工厂）。读 action 正常查 ODS / 其它 topic 数据库。
- batch-writer 启动时**校验** pipeline 不应包含读 action；如包含，发警告但不阻断。
- 读 action 的 `find()` 性能：单 partition 的 key 查（pipeline 通常用 `find_by` 锁定单行）通常几十毫秒，可接受。

### 5.9 ❓ TopicTrigger / new_pipeline 关闭后是否影响其他系统？

- `TopicTrigger` 是 pipeline 内部数据类，**不持久化**。`new_pipeline()` 闭包注入 `lambda schema, trigger: None`；下级 pipeline context 永远不入队。
- `PipelineMonitorLog` 走 `handle_monitor_log` 回调（写 monitor topic / db）。batch-writer 注入 silent monitor log，**不写**。
- 无外部副作用。

### 5.10 ❓ 多 ODS fan-out 是否更容易支持？

**是**。当前 `_pick_best_target` 只选一个 ODS 目标。拦截器方案天然支持 fan-out：

- `WriteBufferingTopicDataService` 改为 per-topic schema 的 buffer（在 `BatchPipelineTopicStorages` 内部维护 `{ods_topic_id: buffer}`）
- `flush()` 对每个 ODS topic 各 flush 一次
- 跨 topic 写入**不在同一事务**（at-least-once 妥协；exactly-once 需要 2PC，复杂度爆炸）
- fan-out 顺序与 pipeline actions 顺序一致

---

## 6. 实施路线（修订）

### Phase 1：扩展 `TopicDataStorageSPI`（向下兼容，**不破坏现有调用方**）

1. 在 `TopicDataStorageSPI` 加抽象方法 `batch_insert` / `batch_upsert`（默认抛 `NotImplementedError`）。
2. 在 PG / MySQL SPI 实现里加 batch 路径。
3. 单元测试：每个 SPI 的 batch 路径 + 错误路径。

预计工时：**3-4 天**（5 个 SPI × 半天 + 测试 + 集成）。

### Phase 2：新增 `WriteBufferingTopicDataService` + `BatchPipelineTopicStorages` + 扩展 `TopicStorages` 接口

1. 在 `data-kernel` 新建 `storage/write_buffering_data_service.py`。
2. 实现 `WriteBufferingTopicDataService`：buffer + flush；独立于 `TopicDataService` 类层次。
3. 扩展 `TopicStorages` 接口：加 `ask_topic_data_service()`（默认走全局工厂，向下兼容）。
4. 修改 `CompiledAction.ask_topic_data_service()`：优先调 `storages.ask_topic_data_service()`。
5. 实现 `BatchPipelineTopicStorages`：`ask_topic_data_service()` 按 topicId 分发；per-topic buffer。
6. 单元测试 + 与 pipeline-kernel 联调。

预计工时：**2-3 天**。

### Phase 3：batch-writer 端用 `BatchPipelineRunner` 替换原 writer

1. 在 batch-writer 端写 `BatchPipelineRunner`，对每条 CDC row 跑一次 `RuntimeCompiledPipeline.run()`。
2. 软删除走单独路径（不跑 pipeline），用现成的 `adapters/mysql.py` 等。
3. 保留 `consumer.py`、`accumulator.py`、offset 提交逻辑不动。
4. 单元测试覆盖：
   - 单条 INSERT（无 loop）
   - 单条 UPDATE（无 loop）
   - DELETE 软删除（走 writer 自己）
   - **含 array 的 CDC 行 + CopyToMemoryAction + loop 单元**
   - 嵌套 loop
   - 多 action 写不同 ODS（fan-out）
   - 失败时 buffer 清理 + at-least-once 重发

预计工时：**3-5 天**。

### Phase 4：集成测试 + 文档

1. 集成测试：与 watchmen-pipeline-surface 写同一 topic，结果一致。
2. 性能对比：旁路 vs 拦截器在 PG/MySQL 上的 throughput（特别是 array 场景）。
3. 文档更新：CODE_MAP / DESIGN / 实施笔记。

预计工时：**2-3 天**。

**总工时：约 2-3 周**（与原方案相当，但能正确处理 array 场景）。

---

## 7. 风险

| 风险 | 等级 | 缓解 |
|---|---|---|
| `find()` 短路后 `update_by_id_and_version` 走错分支 | 中 | 测试覆盖；buffer 在 flush 时统一走 batch_upsert |
| `RuntimeCompiledPipeline.run()` 副作用（monitor log、worker pool） | 中 | 注入 `noop_queue` + silent monitor log |
| 各 storage SPI 实现差异，部分数据库 batch 性能提升有限 | 中 | 降级路径已设计；提供性能 benchmark 报告 |
| `TopicDataStorageSPI` 改动影响其他 watchmen 服务 | 中 | 向下兼容：新方法默认抛 `NotImplementedError`；其他服务不调即可 |
| pipeline 编译缓存与 batch-writer 实例生命周期不一致 | 低 | batch-writer 启动时 `CacheService.compiled_pipeline()` 强刷一次 |
| 跨租户安全 | 低 | PAT 认证 + 缓存 key 包含 tenantId 已有 |
| array 场景下大量元素触发 buffer overflow | 低 | buffer 在 flush 后清空；单批大小受 `batchSize` 控制 |
| `new_pipeline()` 级联被完全抑制 | 低 | 已是 batch-writer 设计目标；no-op 队列明示实现 |
| `find`/`exists` 等读操作在 batch 路径意外触发 | 低 | `WriteBufferingTopicDataService` 不实现读方法，调到就抛 `NotImplementedError` |
| 多 ODS fan-out 跨事务一致性 | 中 | 文档明文：at-least-once；exactly-once 需要 2PC |
| pipeline 含 read action 性能 | 中 | 启动时校验；通常读 action 走 key 查，性能可接受 |

---

## 8. 可行性结论

**可行，强烈推荐**。理由：

1. **改造面可控**：3 个新类（buffer + storages + noop queue），`TopicDataStorageSPI` 小幅扩展（向下兼容）。
2. **完全复用 pipeline**：包括 §2.5 的 CopyToMemory + loop 展开场景，**旁路方案完全缺失的能力**。
3. **性能不退化**：SQL 路径完全一致，pipeline 一层 overhead 是微秒级。
4. **与 pipeline-surface 100% 行为一致**：解决"两个写入路径不一致"的根本问题。
5. **为未来铺路**：多 ODS fan-out、聚合运算、read-then-write 等需求在拦截器方案下"免费"获得。

**前置条件**：

- 接受 `TopicDataStorageSPI` 抽象层小幅扩展（向下兼容）
- 接受 batch-writer 端代码复杂度略有上升
- 接受 2-3 周实施周期
- 接受"array 场景的回归测试需要新增"

**替代方案**（如不愿意改 `data-kernel`）：

- 维持当前旁路实现，仅把 `_build_field_map` 改为调 `parse_mapping_for_storage()` 复用 mapping 解析
- **不解决** array 场景（必须由人工把 `data[]` 拍平）
- 不动 SPI，batch 写入仍走现有 `adapters/postgres.py` 等

---

## 9. 待确认问题

1. **是否同意扩展 `TopicDataStorageSPI`**？需要 data-kernel maintainer review。
2. **软删除语义**：保持当前（`is_deleted=1`）还是改成"伪物理删除"（同当前，但通过 `CompiledDeleteRowAction` 走）？**推荐前者**（不跑 pipeline，更简单）。
3. **多 ODS fan-out**：现在做还是 P2？**推荐 P1**（拦截器方案实现成本极低）。
4. **性能基准**：在真实生产数据量（特别是含 array 的场景）上跑一次对比（旁路 vs 拦截器）再决策。
5. **`find()` 短路**：是否接受"放弃 find-then-branch 语义、统一走 batch_upsert"？**推荐接受**（batch-writer 场景下没必要 find）。
6. **monitor log**：是否需要在 batch-writer 端也写 `MonitorLogAction`？目前建议**否**（增加复杂度，Prometheus 已足够）。
7. **聚合算术（`SUM`/`AVG`）**：拦截器方案下 **不推荐**支持（batch 场景无意义）。如要支持见 §3.3.3 备注。

---

## 附录 A：相关文件路径

| 文件 | 行 | 关注点 |
|---|---|---|
| `watchmen-pipeline-kernel/src/watchmen_pipeline_kernel/pipeline/pipeline_trigger.py` | 145 | `PipelineTrigger.invoke`（**不调**——Kafka 入口自己接管） |
| `watchmen-pipeline-kernel/src/watchmen_pipeline_kernel/pipeline/pipelines_dispatcher.py` | 18 | 调度器（**不调**——用 noop queue 取代） |
| `watchmen-pipeline-kernel/src/watchmen_pipeline_kernel/pipeline_schema/compiled_pipeline.py` | 33 | `RuntimeCompiledPipeline`（**核心复用对象**） |
| `watchmen-pipeline-kernel/src/watchmen_pipeline_kernel/pipeline_schema/compiled_stage.py` | 17 | `CompiledStage.run`（pipeline 调度） |
| `watchmen-pipeline-kernel/src/watchmen_pipeline_kernel/pipeline_schema/compiled_unit.py` | 18, 24 | `CompiledUnit` + `run`（**loop 展开核心**） |
| `watchmen-pipeline-kernel/src/watchmen_pipeline_kernel/pipeline_schema/compiled_action.py` | 186 | `CompiledCopyToMemoryAction`（array 抽出） |
| `watchmen-pipeline-kernel/src/watchmen_pipeline_kernel/pipeline_schema/compiled_action.py` | 526, 562, 620, 750, 776, 813 | `CompiledInsertion/Update/InsertRow/.../DeleteRow/DeleteRows`（拦截点） |
| `watchmen-pipeline-kernel/src/watchmen_pipeline_kernel/pipeline_schema/pipeline_context.py` | 12 | `RuntimePipelineContext`（拿到 compiled pipeline 入口） |
| `watchmen-pipeline-kernel/src/watchmen_pipeline_kernel/pipeline_schema_interface/topic_storages.py` | 8 | `TopicStorages` 接口（`BatchPipelineTopicStorages` 实现此） |
| `watchmen-pipeline-kernel/src/watchmen_pipeline_kernel/pipeline_schema_interface/create_queue_pipeline.py` | — | `CreateQueuePipeline` 类型别名（`Callable`）；batch-writer 传 `lambda` 短路 |
| `watchmen-data-kernel/src/watchmen_data_kernel/storage/data_service.py` | 84 | `TopicDataService` 基类（`WriteBufferingTopicDataService` 继承） |
| `watchmen-data-kernel/src/watchmen_data_kernel/storage/data_service.py` | 357, 376, 429 | 单行 `insert` / `update_by_id_and_version` / `delete_by_id_and_version`（**拦截对象**） |
| `watchmen-data-kernel/src/watchmen_data_kernel/service/service_helper.py` | 12 | `ask_topic_data_service` 工厂（不需改） |
| `watchmen-data-kernel/src/watchmen_data_kernel/storage_bridge/ask_from_storage.py` | 1027, 1233 | `ParsedStorageMappingFactor` / `ParsedStorageMapping`（**自动复用**） |
| `watchmen-data-kernel/src/watchmen_data_kernel/storage_bridge/ask_from_memory.py` | 390, 569 | `ParsedMemoryTopicFactorParameter` / `ParsedMemoryConstantParameter`（**自动复用**） |
| `watchmen-data-kernel/src/watchmen_data_kernel/storage_bridge/variables.py` | 10 | `PipelineVariables`（`BatchPipelineRunner` 构造） |
| `watchmen-data-kernel/src/watchmen_data_kernel/cache/cache_service.py` | — | `CacheService.compiled_pipeline()`（复用 pipeline 编译缓存） |
| `watchmen-storage/src/watchmen_storage/storage_spi.py` | 221 | `TopicDataStorageSPI`（加 batch 抽象方法） |
| `watchmen-storage-postgresql/...` | — | PG SPI 加 batch 路径 |
| `watchmen-storage-mysql/...` | — | MySQL SPI 加 batch 路径 |
| `watchmen-batch-writer/src/watchmen_batch_writer/writer.py` | — | 重写为 `BatchPipelineRunner` |
| `watchmen-batch-writer/src/watchmen_batch_writer/config_resolver.py` | 200 | `_resolve_ods_mapping` 保持现有逻辑（**拦截器方案下其实不需要手写 field_map，但仍需解析得到目标 ODS + ods_topic_id 以建 buffering data service**） |

## 附录 B：array 场景端到端示例

**输入**（Canal CDC 消息 `data[0]`）：
```json
{
  "id": "order-001",
  "order_no": "X123",
  "items": [
    {"sku": "A", "qty": 2, "price": 10.0},
    {"sku": "B", "qty": 1, "price": 20.0}
  ]
}
```

**Pipeline 配置**：
```
Stage[0]:
  Unit[0]:  # no loop
    Action: CopyToMemoryAction
      variableName = "items"
      source = ConstantParameter{ value = "data.items" }
  Unit[1]:  # hasLoop, loopVariableName="items"
    Action: InsertRowAction
      mapping = [
        { source: {kind=topic, factorId=item_sku},  factorId: ods_sku },
        { source: {kind=topic, factorId=item_qty},  factorId: ods_qty },
        { source: {kind=topic, factorId=item_price},factorId: ods_price }
      ]
```

**拦截器方案运行时序**：
```
BatchPipelineRunner.write_batch(group):
  for cdc_row in group.sorted_rows():     # 1 条 CDC row
    variables = PipelineVariables(current_data=cdc_row, topic=raw_topic)
    
    pipeline.run(..., storages=batch_storages, ...)
      # 注：CreateQueuePipeline (noop) 在 PipelineContext 构造时注入，
      #     pipeline.run() 本身不接受 new_pipeline 参数
      # === Stage[0] ===
      CompiledUnit[0].run():
        CopyToMemoryAction.do_run():
          value = parsedSource.value(variables)  # = cdc_row["items"] = 2-element array
          variables.put("items", value)
      
      # === Stage[0].Unit[1] (loop) ===
      CompiledUnit[1].run():
        loop_value = variables.find("items")  # = 2-element array
        for element in loop_value:           # 2 iterations
          cloned = variables.shallow_clone()
          cloned.put("items", element)
          CompiledUnit[1].do_run():
            InsertRowAction.do_run():
              mapped = parsedMapping.run(...)  # = {ods_sku: element.sku, ...}
              # ↓↓↓ 这是关键拦截点 ↓↓↓
              data_service.insert(mapped)     # → 调 WriteBufferingTopicDataService.insert
                                                # → 复刻 helper 赋值
                                                # → append 到 _insert_buffer
  
  # 1 条 CDC row 处理完，buffer 收到 2 条 mapped row
  
  batch_storages.flush_buffer(pk_columns, soft_delete_flag):
    storage.batch_insert(_insert_buffer, helper)
      # PG: COPY ... FROM STDIN  (2 行)
      # MySQL: INSERT INTO ... VALUES (...), (...)
    
    清空 _insert_buffer
```

**结果**：1 条 CDC row → 1 次 PG COPY → 2 行写入 ODS。`at-least-once` 由 Kafka offset 保证（pipeline 内部 `do_run` 失败 → 抛异常 → 不 commit offset → 重试整批）。

**与 pipeline-surface 行为对比**：两者产生**完全相同**的 ODS 行（同样的 helper 赋值、同样的 mapping、同样的类型转换）。这是拦截器方案最大的价值。

## 附录 C：当前实现 vs 提案对照

| 维度 | 当前（旁路）实现 | 提案（拦截器） |
|---|---|---|
| Field mapping | 手写 `_build_field_map`，仅 `kind=topic` | ✅ 复用 `ParsedStorageMappingFactor`，支持全部 3 种 kind + 算术 |
| CopyToMemory + Loop | ❌ 不支持 array 场景 | ✅ pipeline 原生支持 |
| 与 pipeline-surface 一致性 | 漂移风险 | 100% 一致 |
| 软删除 | writer 手工 `_mark_soft_delete` | flush 时合并 delete buffer 走 batch_upsert |
| 多 ODS fan-out | ❌ 只选一个 | ✅ per-topic buffer 天然支持 |
| 改动面 | 仅 batch-writer（**已上线**） | data-kernel（新增）+ 5 个 storage SPI + pipeline-kernel（小） |
| at-least-once | ✅ | ✅ |
| 性能（PG COPY / MySQL 多行） | ✅ ~27ms / ~180ms | ✅ 同（SQL 路径不变） |
| 工时 | — | ~2-3 周 |

**当前**实现**已解决**：

- P0 offset 提交 / retry / accumulator 失败回填 / DELETE 不覆盖非 PK / MySQL 连接 / Kafka 重连
- P1 health endpoint / binlog 排序 / batch add / preload / PG COPY 类型适配
- P2 _collect_mappings_by_target 多 pipeline 合并 + 跳过 disabled / 平局确定性 / 过滤非常量 kind

**当前实现尚未解决**（仅靠提案解决）：

- 含 array 的 CDC 行展开为多条 ODS 行
- `kind=constant` / `kind=computed` 的 MappingFactor source
- 多 ODS fan-out

**结论**：当前实现可投产，提案为下一阶段演进方向。
