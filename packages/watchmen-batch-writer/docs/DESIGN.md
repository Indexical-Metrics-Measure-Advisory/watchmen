# watchmen-batch-writer 设计方案

## 1. 背景与目标

### 1.1 问题

当前从 logbase CDC 数据写入 ODS 层 topic 的链路较长：

```
Source DB → Collector → change_data_record → change_data_json → (pipeline) → ODS topic
```

每个环节都有开销，且当只需要将 CDC 数据批量灌入 ODS 层、不需要触发数据管道时，整条链路显得过重。

### 1.2 目标

新建 `watchmen-batch-writer` 模块，实现：

1. **监听 Kafka** — 消费 logbase 的 CDC 数据消息
2. **批量写入 topic** — 将数据批量写入 ODS 层 topic 存储
3. **不触发数据管道** — 写入操作不触发任何 pipeline

## 2. 核心设计原理

### 2.1 管道触发链路分析

现有写 topic 并触发管道的链路：

```
save_topic_data()
  └── TopicDataService.trigger_by_insert(data)    # 写入数据，返回 TopicTrigger
        └── TopicTrigger { previous, current, triggerType, internalDataId }

handle_trigger_data(trigger_data, topic_trigger)
  └── PipelineTrigger(...).start(topic_trigger)   # 查管道，执行管道
        └── find pipelines by topic_id
        └── PipelinesDispatcher.start()           # 执行所有匹配的管道
```

**不触发管道的关键**：`trigger_by_insert()` 只是写入数据并返回元信息，管道触发发生在 `PipelineTrigger.start(topic_trigger)` 调用时。如果不调用 `PipelineTrigger.start()`，数据就单纯写入，管道不会执行。

### 2.2 Ingest Table 定义 & Pipeline 转换复用

做 source table → ODS topic 同步时，需要知道源表结构和字段映射关系。这些信息已经存在于 ingest table 配置和 pipeline 定义中，可以直接复用，无需重复配置。

#### 标准 CDC 数据结构（Canal 格式）

Kafka 消息来自 logbase 的标准 CDC 日志，采用 **Canal 格式**：

```json
{
	"database": "your_database_name",
	"table": "your_table_name",
	"type": "INSERT",
	"ts": 1717308900000,
	"id": 12345,
	"isDdl": false,
	"sql": "INSERT INTO your_table_name (id, name) VALUES (1, 'Tencent')",
	"mysqlType": {
		"id": "INTEGER",
		"name": "VARCHAR(255)"
	},
	"data": [{ "id": "1", "name": "Tencent" }],
	"old": []
}
```

| 字段         | 类型   | 说明               | batch-writer 用途                                      |
| ------------ | ------ | ------------------ | ------------------------------------------------------ |
| `database`   | string | 数据库名           | 辅助定位                                               |
| `table`      | string | **源表名**         | ★ **查找链路入口** → CollectorTableConfig.tableName    |
| `type`       | string | 操作类型           | ★ `INSERT`/`UPDATE`/`DELETE` → 决定路由策略            |
| `ts`         | long   | 变更时间戳         | 可选，用于排序/去重                                    |
| `id`         | long   | binlog position    | 可选                                                   |
| `isDdl`      | bool   | 是否 DDL 语句      | DDL 直接跳过                                           |
| `sql`        | string | 原始 SQL           | 调试用                                                 |
| `mysqlType`  | object | 列类型元数据       | 可选，辅助类型转换                                     |
| **`data[]`** | array  | **变更后的数据行** | ★ 实际要写入的 CDC payload（注意：Canal 值都是字符串） |
| **`old[]`**  | array  | **变更前的数据行** | UPDATE 场景旧值                                        |

**关键点**：

- `table` 是查找入口 → `CollectorTableConfig.tableName`
- `type` 决定写入策略：`INSERT`→纯插入 / `UPDATE`→UPSERT / `DELETE`→跳过或软删除
- `data[]` 是数组格式，一条消息可能包含多行变更
- Canal 输出的值**全部是字符串类型**，需要按 `mysqlType` 或 ODS topic schema 做类型转换
- **无 `modelName` 字段**，需要通过 `table` 反查 `CollectorTableConfig` → `modelName`

```python
class CanalCDCMessage(ExtendedBaseModel):
    database: str
    table: str                          # ★ 查找入口
    type: str                           # INSERT / UPDATE / DELETE
    ts: Optional[int] = None
    id: Optional[int] = None
    isDdl: bool = False
    sql: Optional[str] = None
    mysqlType: Optional[Dict[str, str]] = None
    data: List[Dict[str, Any]]          # ★ CDC 数据 payload (字符串值)
    old: List[Dict[str, Any]] = []      # UPDATE 旧值
```

#### 关系链路

```
Kafka CDC Message (Canal)       CollectorTableConfig         CollectorModelConfig      Raw Topic        Pipeline           ODS Topic
┌──────────────────┐          ┌──────────────┐            ┌──────────────┐        ┌────────┐     ┌──────────┐      ┌──────────┐
│ table ────────────┼─────────▶│ tableName    │            │ modelName    │        │ name   │     │ topicId  │─────▶│ topicId  │
│ (源表名)          │          │ (匹配)       │◀───────────┤ (匹配)       │        │ factors│     │ stages[] │      │ factors[]│
│ data[]            │          │ modelName ────┼────────────▶│ rawTopicCode ├───────▶│(匹配)  │     │ └units[] │      │          │
│ type (INSERT/UPD) │          │ primaryKey   │            │ modelId      │        └────────┘     │  └do[]   │      └──────────┘
│ mysqlType         │          │ ignoredCols  │            └──────────────┘                        │ InsertRow│
└──────────────────┘          │ jsonColumns  │                                                    │ Action   │
                               └──────────────┘                                                    │ mapping[]│
                                                                                                  │ source──▶Raw Factor
                                                                                                  │ factorId▶ODS Factor
                                                                                                  └──────────┘
```

**查找链路**：`table` → **CollectorTableConfig** (by tableName) → `modelName` → **CollectorModelConfig** → `rawTopicCode` → Raw Topic → Pipeline → ODS Topic

关键代码参考：

| 概念                                  | 代码位置                                                                                                                                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Canal CDC Message** (Kafka消息格式) | 本模块 `model.py` 定义 `CanalCDCMessage`                                                                                                                                                    |
| CollectorTableConfig 模型             | [collector_table_config.py](file:///Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-collector-kernel/src/watchmen_collector_kernel/model/collector_table_config.py#L75-L107) |
| CollectorModelConfig (含rawTopicCode) | [collector_model_config.py](file:///Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-collector-kernel/src/watchmen_collector_kernel/model/collector_model_config.py#L6-L13)   |
| Pipeline 查询 by topicId              | [pipeline_service.py](file:///Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-meta/src/watchmen_meta/admin/pipeline_service.py#L106-L115)                                    |
| MappingFactor 定义                    | [pipeline_action_write.py](file:///Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-model/src/watchmen_model/admin/pipeline_action_write.py#L10-L22)                          |
| TopicSchema 查询                      | [topic_service.py](file:///Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-data-kernel/src/watchmen_data_kernel/meta/topic_service.py#L67-90)                                |

#### 复用步骤

**Step 1: 从 Kafka 消息解析 Canal CDC 结构**

```python
# Kafka 消息即为 Canal 格式 CDC
canal_msg = CanalCDCMessage.parse_obj(msg.value)
# canal_msg.table     → "your_table_name"    ★ 查找入口（源表名）
# canal_msg.type      → "INSERT" / "UPDATE" / "DELETE"  ★ 操作类型
# canal_msg.data      → [{"id": "1", "name": "Tencent"}]  ★ 实际业务数据（字符串值）
# canal_msg.mysqlType → {"id": "INTEGER", "name": "VARCHAR(255)"}  列类型
```

**Step 2: 通过 table 名查找 Ingest 配置链路**

```python
from watchmen_collector_kernel.storage.collector_table_config_service import CollectorTableConfigService
from watchmen_collector_kernel.storage.collector_model_config_service import CollectorModelConfigService

# 2a: 通过 table 名找到 CollectorTableConfig（源表结构定义）
table_configs = table_config_service.find_by_table_name(canal_msg.table, tenant_id)
# 通常取根表配置（parentName 为空的那个）
root_config = next(c for c in table_configs if not c.parentName)

# 2b: 通过 root_config.modelName 找到 CollectorModelConfig → 获得 rawTopicCode
model_config = model_config_service.find_by_name(root_config.modelName, tenant_id)
# model_config.rawTopicCode → "raw_order"
```

**Step 3: 通过 rawTopicCode 加载 Raw Topic + Pipeline 映射**

```python
from watchmen_data_kernel.meta.topic_service import TopicService
from watchmen_data_kernel.meta.pipeline_service import PipelineService

# 通过 model_config.rawTopicCode 找到 raw topic schema
raw_topic_schema = topic_service.find_schema_by_name(
    model_config.rawTopicCode, tenant_id)
raw_topic = raw_topic_schema.get_topic()

# 通过 raw_topic.topicId 找到所有监听该 topic 的 pipeline
pipelines = pipeline_service.find_by_topic_id(raw_topic.topicId)
```

**Step 4: 提取 MappingFactor，构建字段映射表**

Pipeline 的每个 write action（`insert-row`、`insert-or-merge-row`、`merge-row`）包含 `mapping` 列表，每个 `MappingFactor` 定义了：

```python
MappingFactor(
    source=TopicFactorParameter(      # 数据来源
        kind='topic',
        topicId='raw_topic_id',       # ← 指向 raw topic
        factorId='raw_factor_id'      # ← raw topic 中的字段
    ),
    factorId='target_factor_id',      # ← 目标 ODS topic 中的字段
    arithmetic='none'                 # none / count / sum / avg
)
```

通过 `factorId` 查询对应 Topic 的 `factors` 列表得到 `factorName`，构建映射表：

```python
def build_field_mapping(raw_topic, ods_topic, mapping_factors):
    """将 factorId → factorName，构建 {source_name: target_name} 映射表"""
    raw_factor_map  = {f.factorId: f.name for f in raw_topic.factors}
    ods_factor_map  = {f.factorId: f.name for f in ods_topic.factors}
    field_map = {}
    for mf in mapping_factors:
        src_name = raw_factor_map.get(mf.source.factorId)
        tgt_name = ods_factor_map.get(mf.factorId)
        if src_name and tgt_name:
            field_map[src_name] = tgt_name
    return field_map
```

**Step 5: 对 Canal data[] 逐行应用映射转换**

```python
def transform_canal_rows(canal_data: List[Dict], field_map: dict) -> List[Dict]:
    """对 Canal data[] 中每行数据按映射表转换为 ODS 格式
    注意：Canal 的值全部是字符串，后续 prepare_data 会做类型转换
    """
    result = []
    for row in canal_data:
        transformed = {field_map[k]: v for k, v in row.items() if k in field_map}
        result.append(transformed)
    return result
```

**注意**：Canal 输出的值全部是**字符串类型**（如 `"1"` 而非 `1`），在 `schema.prepare_data()` 阶段会根据 ODS topic factor 类型自动转换。

#### 完整查找链示意图

```
Kafka Message (Canal CDC)
  │
  ├── table = "your_table_name" ─────────────────────────────┐
  │   type = "INSERT" / "UPDATE" / "DELETE"                  │
  │   data[] = [{...}, ...]                                   │
  ▼                                                           │
CollectorTableConfig                                          │
  .find_by_table_name(table)                                  │
  │                                                           │
  ├── tableName (匹配)                                        │
  ├── modelName ──────────────────────────────┐              │
  ├── primaryKey (UPSERT 用)                   │              │
  └── ignoredColumns / jsonColumns             │              │
                                               ▼              │
                                    CollectorModelConfig      │
                                      .find_by_name(modelName) │
                                               │              │
                                               ▼              │
                                      rawTopicCode            │
                                               │              │
                                               ▼              │
                                    Raw Topic Schema          │
                                      .find_by_name()         │
                                               │              │
                                               ▼              │
                                    raw_topic.topicId         │
                                               │              │
                                               ▼              │
                                    PipelineService            │
                                      .find_by_topic_id()      │
                                               │              │
                                               ▼              │
                                    Pipeline(s)                │
                                      .mapping[] ◀────────────┘ (字段名对应 raw topic factors)
                                               │
                                               ▼
                                    MappingFactor[]
                                      → build_field_map()
                                               │
                                               ▼
                                    transform_canal_rows(data[], field_map)
                                               │
                                               ▼
                                    ODS Topic Data (准备写入)
```

#### 复杂参数处理

| 参数类型                             | 处理方式                                                            |
| ------------------------------------ | ------------------------------------------------------------------- |
| **TopicFactorParameter**（1:1 映射） | 直接取 CDC 数据中的同名/映射字段                                    |
| **ConstantParameter**（固定值）      | 取 `parameter.value` 设置为目标字段值                               |
| **ComputedParameter**（计算值）      | 需实现对应计算逻辑（`year-of`、`case-then` 等），初期可跳过复杂计算 |
| **AggregateArithmetic**（聚合）      | `count`/`sum`/`avg` 在批量场景下逐行无意义，batch-writer 场景下忽略 |

#### Pipeline → MappingFactor 提取核心代码

```python
from watchmen_model.admin.pipeline_action_write import InsertRowAction, MergeRowAction
from watchmen_model.admin.pipeline_action import WriteTopicActionType

def extract_mappings(pipeline):
    """从 pipeline 中提取所有写 action 的 mapping 和 target_topic_id"""
    for stage in pipeline.stages:
        for unit in stage.units:
            for action in unit.do:
                if action.type in (
                    WriteTopicActionType.INSERT_ROW,
                    WriteTopicActionType.INSERT_OR_MERGE_ROW,
                    WriteTopicActionType.MERGE_ROW
                ):
                    yield action.topicId, action.mapping
```

### 2.3 本模块写入策略：COPY + 临时表 UPSERT

**PostgreSQL COPY 协议本身只支持 INSERT，不支持 UPDATE**。为了支持数据更新（CDC 场景下的 INSERT + UPDATE），采用**两阶段策略**：

```
                     ┌─ INSERT only ──→ COPY 直写目标表
CDC 数据 ──→ 路由 ──┤
                     └─ UPSERT ──→ COPY → 临时表 → ON CONFLICT DO UPDATE → 目标表
```

#### 两阶段 UPSERT 原理

| 阶段               | 操作                                                                          | 性能           |
| ------------------ | ----------------------------------------------------------------------------- | -------------- |
| **Phase 1: COPY**  | 将批次数据 COPY 到临时 staging 表                                             | ~80,000 rows/s |
| **Phase 2: MERGE** | `INSERT INTO target SELECT * FROM staging ON CONFLICT (pk) DO UPDATE SET ...` | ~50,000 rows/s |
| **Phase 3: CLEAN** | DROP staging 表                                                               | 瞬间           |

总吞吐约 **30,000 ~ 40,000 rows/s**，比逐行 UPSERT（~2,000 rows/s）快 **15-20x**。

```
Flush 触发
    │
    ├── PostgreSQL + INSERT only ──→ COPY 快速通道（~80,000 rows/s）
    │
    ├── PostgreSQL + UPSERT ──→ COPY → 临时表 → ON CONFLICT → DROP（~35,000 rows/s）
    │
    └── 其他后端 ──→ insert_all / 逐行 upsert 降级通道（~5,000 rows/s）
```

#### 为什么用临时表而不是直接 INSERT ON CONFLICT

逐行 `INSERT ... ON CONFLICT DO UPDATE` 每条都要走 SQL 解析 + 查询规划 + 唯一索引查找，1000 条约需 500ms。COPY 到临时表（无索引冲突检查）约 12ms，然后一条 MERGE SQL 完成全部 upsert 约 20ms，总共 ~32ms，**快 15 倍**。

#### 后端适配策略

COPY 是 PostgreSQL 特有协议。对于其他存储后端（MongoDB、MySQL 等），降级使用 `storage.insert_all()` 批量 insert 或逐行 upsert。

参考代码：

- [data_service.py trigger_by_insert](file:///Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-data-kernel/src/watchmen_data_kernel/storage/data_service.py#L131-L156)
- [handler.py save_topic_data + trigger_pipeline](file:///Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-collector-surface/src/watchmen_collector_surface/task/handler.py#L36-L59)
- [storage_spi.py insert_all](file:///Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-storage/src/watchmen_storage/storage_spi.py#L31-L33)

## 3. 整体架构

```
┌──────────────────────────────────────────────────────────────────┐
│                          Kafka Topic                              │
│                   (logbase CDC data messages)                     │
└───────────────────────────┬──────────────────────────────────────┘
                            │ poll batch
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                    watchmen-batch-writer                          │
│                                                                   │
│  ┌────────────────┐   ┌──────────────────┐   ┌────────────────┐  │
│  │ Kafka Consumer │   │ Batch Accumulator│   │  Config Loader │  │
│  │                │   │                  │   │                │  │
│  │ · aiokafka     │──▶│ · 按(topic,      │   │ · 加载 ingest  │  │
│  │ · consumer     │   │   tenant) 分组   │   │   table 配置   │  │
│  │   group        │   │ · 数量/时间双阈值 │   │ · 加载 pipeline│  │
│  │ · max_poll     │   │   触发 flush     │   │   映射定义     │  │
│  └────────────────┘   └────────┬─────────┘   └───────┬────────┘  │
│                                │                      │           │
│                                ▼                      ▼           │
│                      ┌──────────────────────────────────────┐    │
│                      │           Batch Writer               │    │
│                      │                                      │    │
│                      │ · 字段映射转换 (field_map)            │    │
│                      │ · prepare_data                       │    │
│                      │ · COPY → 临时表 → ON CONFLICT UPSERT │    │
│                      │ · 无管道触发                          │    │
│                      │ · 失败重试                            │    │
│                      └──────────────────────────────────────┘    │
│                                                                   │
│  输出: 数据写入 ODS Topic 存储表，管道不被触发                       │
└──────────────────────────────────────────────────────────────────┘
```

### 3.1 数据流

```
1. Kafka 消息到达（Canal 格式 CDC）
   ↓
2. Consumer 批量拉取（max_poll_records = batchSize）
   ↓
3. 解析为 CanalCDCMessage { table, type, data[], mysqlType }
   ↓
4. Accumulator 按 (table, tenantId) 分组缓冲
   ↓
5. 达到批量阈值或定时器到期 → 触发 Flush
   ↓
6. ConfigLoader: table → CollectorTableConfig(modelName+primaryKey) → CollectorModelConfig(rawTopicCode)
   ↓
7. rawTopicCode → Raw Topic → Pipeline → 提取 MappingFactor[] → 构建字段映射表
   ↓
8. 对 Canal data[] 逐行应用 transform_canal_rows(data, field_map)
   ↓
9. Writer 获取 ODS TopicSchema → schema.prepare_data() (自动类型转换: str→目标类型)
   ↓
10. type=INSERT  → COPY 直写目标表
    type=UPDATE  → COPY 到临时表 → ON CONFLICT DO UPDATE → DROP 临时表
    type=DELETE  → 提取 old 主键 + 设置 is_deleted=1 → UPSERT（软删除）
    其他后端      → insert_all / 逐行 upsert 降级
   ↓
11. 写入成功 → 提交 Kafka offset
```

## 4. 包结构

```
packages/watchmen-batch-writer/
├── pyproject.toml
├── Dockerfile
└── src/
    └── watchmen_batch_writer/
        ├── __init__.py
        ├── __main__.py          # 入口：解析配置，启动服务 + 优雅关闭
        ├── settings.py          # 配置模型（含 PAT、软删除、监控端口）
        ├── model.py             # Kafka 消息数据模型
        ├── consumer.py          # Kafka 消费者
        ├── accumulator.py       # 批次累积器（分组 + 双阈值 + offset 追踪）
        ├── config_loader.py     # 加载 ingest table 配置 + pipeline 映射
        ├── writer.py            # 批量写入器（字段映射 + COPY/UPSERT + 软删除）
        ├── metrics.py           # Prometheus 指标定义
        ├── health.py            # 健康检查 HTTP server（/health + /metrics）
        └── retry.py             # 重试策略
```

## 5. 组件详细设计

### 5.1 Kafka 消息模型 (`model.py`)

Kafka 消息为 **Canal 格式 CDC**，定义 `CanalCDCMessage` 模型：

```python
from typing import Any, Dict, List, Optional
from watchmen_utilities import ExtendedBaseModel

class CanalCDCMessage(ExtendedBaseModel):
    """Kafka 中 Canal 格式 CDC 消息"""
    database: str                              # 数据库名
    table: str                                 # ★ 源表名（查找链路入口）
    type: str                                  # ★ INSERT / UPDATE / DELETE
    ts: Optional[int] = None                   # 变更时间戳
    id: Optional[int] = None                   # binlog position
    isDdl: bool = False                        # 是否 DDL（DDL 直接跳过）
    sql: Optional[str] = None                  # 原始 SQL
    mysqlType: Optional[Dict[str, str]] = None  # 列类型 {col: "INTEGER"}
    data: List[Dict[str, Any]]                # ★ 变更后的数据行数组（字符串值）
    old: List[Dict[str, Any]] = []             # 变更前的数据行（UPDATE 旧值）

    @property
    def operation(self) -> str:
        """统一操作类型标识，返回小写短标识"""
        t = self.type.upper()
        if t == 'INSERT':
            return 'i'
        if t == 'UPDATE':
            return 'u'
        if t == 'DELETE':
            return 'd'
        return 'unknown'
```

### 5.2 消费者 (`consumer.py`)

参考现有 [pipeline-surface kafka.py](file:///Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-pipeline-surface/src/watchmen_pipeline_surface/connectors/kafka.py) 的实现模式。

```python
from aiokafka import AIOKafkaConsumer
from json import loads

async def consume(settings: BatchWriterSettings, accumulator: BatchAccumulator):
    consumer = AIOKafkaConsumer(
        *settings.topics,
        bootstrap_servers=settings.bootstrapServers,
        group_id=settings.consumerGroup,
        value_deserializer=lambda m: loads(m.decode('utf-8')),
        max_poll_records=settings.batchSize,
        enable_auto_commit=False,          # 手动提交，保证 at-least-once
    )
    await consumer.start()
    try:
        async for msg in consumer:
            try:
                canal_msg = CanalCDCMessage.parse_obj(msg.value)
                if canal_msg.isDdl:
                    continue  # 跳过 DDL
                await accumulator.add(canal_msg)
            except Exception as e:
                logger.error(f"parse message failed: {e}")
        await accumulator.flush_all()
    except Exception as e:
        logger.error(e, exc_info=True)
        await consumer.stop()
        # 重新连接
        await consume(settings, accumulator)
```

**设计要点**：

- 使用 `aiokafka`（与现有 pipeline-surface 保持一致）
- `enable_auto_commit=False`，flush 成功后手动提交 offset
- 异常时递归重连（参考现有 kafka.py 模式）
- Consumer group 保证多实例部署时负载均衡 + offset 管理

### 5.3 批次累积器 (`accumulator.py`)

```python
import asyncio
from collections import defaultdict
from typing import Dict, List, Tuple

class BatchAccumulator:
    def __init__(self, writer: 'BatchTopicWriter',
                 tenant_id: str,
                 batch_size: int = 500,
                 flush_interval: float = 5.0):
        self.writer = writer
        self.tenant_id = tenant_id
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        # 按 table 分组，同一源表的数据批量处理（单租户，tenantId 来自 PAT）
        self.buffers: Dict[str, List[CanalCDCMessage]] = defaultdict(list)
        self.lock = asyncio.Lock()

    async def add(self, message: CanalCDCMessage):
        key = message.table
        async with self.lock:
            self.buffers[key].append(message)
            if len(self.buffers[key]) >= self.batch_size:
                await self._flush_key(key)

    async def flush_all(self):
        async with self.lock:
            for key in list(self.buffers.keys()):
                await self._flush_key(key)

    async def _flush_key(self, key: str):
        messages = self.buffers.pop(key, [])
        if messages:
            await self.writer.write_batch(key, self.tenant_id, messages)

    async def periodic_flush(self):
        """定时 flush，确保数据不长时间滞留"""
        while True:
            await asyncio.sleep(self.flush_interval)
            async with self.lock:
                for key in list(self.buffers.keys()):
                    await self._flush_key(key)
```

**设计要点**：

- 按 `table` 分组缓冲，不同源表独立 flush（单租户，tenantId 来自 PAT 配置）
- 数量阈值（`batch_size`）+ 时间阈值（`flush_interval`）双触发
- `asyncio.Lock` 保证并发安全

### 5.4 配置加载器 (`config_loader.py`)

负责加载 ingest table 配置和 pipeline 映射定义，构建字段映射表。

```python
from typing import Dict, List, Optional, Tuple
from watchmen_model.admin import Pipeline, Topic
from watchmen_model.admin.pipeline_action import WriteTopicActionType
from watchmen_collector_kernel.model import CollectorTableConfig, CollectorModelConfig

class ConfigLoader:
    def __init__(self, principal_service):
        self.principal_service = principal_service

    def load_table_config(self, table: str,
                          tenant_id: str) -> Tuple[Optional[CollectorModelConfig],
                                                    Optional[CollectorTableConfig]]:
        """通过 table 名查找 ingest 配置链路。
        返回 (model_config, table_config)
        """
        # Step 1: table → CollectorTableConfig
        table_config = self._find_table_config(table, tenant_id)
        if table_config is None:
            return None, None

        # Step 2: table_config.modelName → CollectorModelConfig
        model_config = self._find_model_config(table_config.modelName, tenant_id)
        if model_config is None:
            return None, None

        return model_config, table_config

    def load_pipeline_mappings(self, raw_topic: Topic
                               ) -> List[Tuple[str, List['MappingFactor']]]:
        """
        加载 pipeline 映射定义。
        返回 [(target_topic_id, [MappingFactor, ...]), ...]
        """
        pipelines = self._find_pipelines_by_topic_id(raw_topic.topicId)
        results = []
        for pipeline in pipelines:
            for target_topic_id, mappings in self._extract_mappings(pipeline):
                results.append((target_topic_id, mappings))
        return results

    def build_field_map(self, raw_topic: Topic, ods_topic: Topic,
                        mappings: List['MappingFactor']) -> Dict[str, str]:
        """
        构建字段映射表 {raw_factor_name: ods_factor_name}
        """
        raw_factor_map = {f.factorId: f.name for f in raw_topic.factors}
        ods_factor_map = {f.factorId: f.name for f in ods_topic.factors}

        field_map = {}
        for mf in mappings:
            src_name = raw_factor_map.get(mf.source.factorId)
            tgt_name = ods_factor_map.get(mf.factorId)
            if src_name and tgt_name:
                field_map[src_name] = tgt_name
        return field_map

    def transform_row(self, cdc_data: dict, field_map: Dict[str, str]) -> dict:
        """将 CDC 数据按映射表转换为 ODS 格式"""
        return {field_map[k]: v for k, v in cdc_data.items() if k in field_map}
```

**设计要点**：

- 映射表在首次 flush 时加载并缓存，后续复用（避免每次 flush 都查 DB）
- 不同 `table` 对应不同的 ingest model → pipeline，映射表独立缓存
- 缓存 key：`(table, tenantId)`

### 5.5 批量写入器 (`writer.py`) — 核心

采用**后端路由 + 写入模式路由**：根据操作类型（INSERT only / UPSERT）和后端类型选择最优写入策略。

```python
import io
import csv
import asyncio
import uuid
from typing import Any, Dict, List
from watchmen_data_kernel.meta import TopicService
from watchmen_data_kernel.service import ask_topic_data_service, ask_topic_storage
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_meta.common import ask_super_admin
from watchmen_storage import TopicDataStorageSPI

class BatchTopicWriter:
    def __init__(self, config_loader: 'ConfigLoader',
                 soft_delete_field: str = "is_deleted",
                 soft_delete_value: Any = 1,
                 max_retries: int = 3, retry_delay: float = 1.0):
        self.config_loader = config_loader
        self.soft_delete_field = soft_delete_field
        self.soft_delete_value = soft_delete_value
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self._field_map_cache: Dict[str, Dict[str, str]] = {}

    async def write_batch(self, table: str, tenant_id: str,
                          messages: List[CanalCDCMessage]):
        principal_service = ask_super_admin()
        principal_service.tenantId = tenant_id

        # 1. 通过 table 名查找 ingest 配置链路
        #    table → CollectorTableConfig → modelName → CollectorModelConfig → rawTopicCode
        model_config, table_config = self.config_loader.load_table_config(table, tenant_id)
        if model_config is None:
            raise Exception(f"Model config not found for table: {table}")
        if table_config is None:
            raise Exception(f"Table config not found for table: {table}")

        raw_topic_code = model_config.rawTopicCode

        raw_schema = TopicService(principal_service).find_schema_by_name(
            raw_topic_code, tenant_id)
        if raw_schema is None:
            raise Exception(f"Raw topic schema not found: {raw_topic_code}")

        # 2. 加载 pipeline 映射（带缓存）
        field_map, ods_schema = self._get_or_load_mapping(
            raw_topic_code, tenant_id, raw_schema.get_topic(), principal_service)
        if ods_schema is None:
            raise Exception(f"No ODS topic found for raw topic: {raw_topic_code}")

        # 3. 对 Canal data[] 逐行应用字段映射转换
        transformed = []
        for msg in messages:
            try:
                for row in msg.data:
                    transformed_row = self.config_loader.transform_row(row, field_map)
                    transformed.append(transformed_row)
            except Exception as e:
                logger.error(f"Transform failed for message: {e}")

        if not transformed:
            return

        # 4. 初始化存储和服务
        storage = ask_topic_storage(ods_schema, principal_service)
        service = ask_topic_data_service(ods_schema, storage, principal_service)
        helper = service.get_data_entity_helper()

        # 5. 按操作类型分组 → 选择 DB Adapter 写入
        sample_msg = messages[0]
        adapter = self._get_adapter(storage)

        if sample_msg.operation == 'd':
            # DELETE: 使用 old 数据 + 设置软删除标记字段
            transformed = []
            for msg in messages:
                for old_row in msg.old:
                    if old_row:
                        row = dict(old_row)
                        row[self.soft_delete_field] = self.soft_delete_value
                        transformed.append(row)
            if not transformed:
                logger.warning(f"DELETE messages with empty old[] for table={table}, skipped")
                return
            pk_columns = self._get_pk_columns(ods_schema)
            rows = self._prepare_base_rows(transformed, ods_schema, service, helper, principal_service)
            for attempt in range(self.max_retries):
                try:
                    storage.connect()
                    adapter.batch_upsert(storage, helper, rows, pk_columns)
                    return
                except Exception as e:
                    logger.error(f"Batch write failed (attempt {attempt+1}/{self.max_retries})", e)
                    if attempt < self.max_retries - 1:
                        await asyncio.sleep(self.retry_delay)
                    else:
                        raise
                finally:
                    storage.close()
        else:
            # INSERT / UPDATE: 正常写入
            pk_columns = self._get_pk_columns(ods_schema)
            rows = self._prepare_base_rows(transformed, ods_schema, service, helper, principal_service)
            for attempt in range(self.max_retries):
                try:
                    storage.connect()
                    if sample_msg.operation == 'i':
                        adapter.batch_insert(storage, helper, rows)
                    else:
                        adapter.batch_upsert(storage, helper, rows, pk_columns)
                    return
                except Exception as e:
                    logger.error(f"Batch write failed (attempt {attempt+1}/{self.max_retries})", e)
                    if attempt < self.max_retries - 1:
                        await asyncio.sleep(self.retry_delay)
                    else:
                        raise
                finally:
                    storage.close()

    def _get_or_load_mapping(self, raw_topic_code, tenant_id,
                             raw_topic, principal_service):
        """从缓存获取或加载字段映射表"""
        cache_key = f"{raw_topic_code}:{tenant_id}"
        if cache_key in self._field_map_cache:
            return self._field_map_cache[cache_key]

        # 加载 pipeline 映射
        mappings = self.config_loader.load_pipeline_mappings(raw_topic)
        if not mappings:
            return None, None

        target_topic_id, mapping_factors = mappings[0]
        ods_schema = TopicService(principal_service).find_schema_by_id(
            target_topic_id, tenant_id)
        if ods_schema is None:
            return None, None

        field_map = self.config_loader.build_field_map(
            raw_topic, ods_schema.get_topic(), mapping_factors)
        self._field_map_cache[cache_key] = (field_map, ods_schema)
        return field_map, ods_schema

    def _get_adapter(self, storage: TopicDataStorageSPI):
        """根据存储后端获取对应的数据库适配器"""
        from watchmen_batch_writer.adapters import AdapterFactory
        return AdapterFactory.get(storage)

    def _get_pk_columns(self, schema) -> List[str]:
        """获取 ODS topic 的主键列"""
        entity_helper = schema.get_entity_helper()
        return entity_helper.get_primary_key_columns()

    def _prepare_base_rows(self, data_list, schema, service, helper, principal_service):
        """准备数据行：prepare_data + 分配固定列"""
        prepared = [schema.prepare_data(d.copy(), principal_service) for d in data_list]
        rows = []
        for data in prepared:
            topic_data = service.try_to_wrap_to_topic_data(data)
            helper.assign_fix_columns_on_create(
                data=topic_data,
                snowflake_generator=service.get_snowflake_generator(),
                principal_service=principal_service,
                now=service.now()
            )
            rows.append(topic_data)
        return rows
```

**DB Adapter 层说明**：

`BatchTopicWriter` 不再包含数据库特定的写入逻辑。所有数据库操作委托给 `AdapterFactory` 返回的适配器：

```python
# adapters/__init__.py
class AdapterFactory:
    _adapters = {
        DataSourceType.POSTGRESQL: PostgresAdapter(),
        DataSourceType.MYSQL: MySQLAdapter(),
    }

    @classmethod
    def get(cls, storage) -> BaseAdapter:
        ds_type = storage.get_data_source_type()
        return cls._adapters.get(ds_type, GenericAdapter())
```

每个 Adapter 实现 `BaseAdapter` 接口：

```python
# adapters/base.py
class BaseAdapter:
    def batch_insert(self, storage, helper, rows) -> int: ...
    def batch_upsert(self, storage, helper, rows, pk_columns) -> int: ...
```

### 5.5.1 PostgreSQL Adapter

```python
# adapters/postgres.py
class PostgresAdapter(BaseAdapter):
    """PostgreSQL: COPY + 临时表 UPSERT"""

    def batch_insert(self, storage, helper, rows) -> int:
        """COPY 直写目标表"""
        entity_helper = helper.get_entity_helper()
        columns = entity_helper.get_column_names()
        target = entity_helper.get_table_name()
        self._copy_csv(storage, rows, columns, target)
        return len(rows)

    def batch_upsert(self, storage, helper, rows, pk_columns) -> int:
        """COPY → 临时表 → ON CONFLICT DO UPDATE"""
        entity_helper = helper.get_entity_helper()
        target_table = entity_helper.get_table_name()
        columns = entity_helper.get_column_names()
        staging = f"_staging_{target_table}_{uuid.uuid4().hex[:8]}"

        conn = storage.get_raw_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                f'CREATE TEMP TABLE "{staging}" '
                f'(LIKE "{target_table}" INCLUDING DEFAULTS)'
            )
            self._copy_csv(storage, rows, columns, staging)

            col_names = ', '.join(f'"{c}"' for c in columns)
            if pk_columns:
                pk_names = ', '.join(f'"{c}"' for c in pk_columns)
                update_sets = ', '.join(
                    f'"{c}" = EXCLUDED."{c}"'
                    for c in columns if c not in pk_columns
                )
                merge_sql = (
                    f'INSERT INTO "{target_table}" ({col_names}) '
                    f'SELECT {col_names} FROM "{staging}" '
                    f'ON CONFLICT ({pk_names}) DO UPDATE SET {update_sets}'
                )
            else:
                merge_sql = (
                    f'INSERT INTO "{target_table}" ({col_names}) '
                    f'SELECT {col_names} FROM "{staging}"'
                )
            cursor.execute(merge_sql)
            cursor.execute(f'DROP TABLE IF EXISTS "{staging}"')
            conn.commit()
        except Exception:
            conn.rollback()
            try:
                cursor.execute(f'DROP TABLE IF EXISTS "{staging}"')
                conn.commit()
            except Exception:
                pass
            raise
        return len(rows)

    def _copy_csv(self, storage, rows, columns, target):
        """psycopg2 COPY 协议批量写入"""
        raw_conn = storage.get_raw_connection()
        buf = io.StringIO()
        writer = csv.writer(buf, delimiter='\t', lineterminator='\n',
                            quoting=csv.QUOTE_NONE, escapechar='\\')
        entity_helper = storage.get_entity_helper()
        for row in rows:
            values = [entity_helper.get_column_value(row, col) for col in columns]
            writer.writerow(values)
        buf.seek(0)
        cursor = raw_conn.cursor()
        col_names = ', '.join(f'"{c}"' for c in columns)
        cursor.copy_expert(
            f'COPY "{target}" ({col_names}) FROM STDIN '
            f"WITH (FORMAT CSV, DELIMITER E'\\t')",
            buf
        )
```

### 5.5.2 MySQL Adapter

```python
# adapters/mysql.py
class MySQLAdapter(BaseAdapter):
    """MySQL: 多行 INSERT ... ON DUPLICATE KEY UPDATE"""

    MAX_BATCH = 1000  # MySQL 多行 INSERT 每批最多 1000 行

    def batch_insert(self, storage, helper, rows) -> int:
        """分批执行多行 INSERT"""
        total = 0
        for chunk in self._chunks(rows, self.MAX_BATCH):
            sql = self._build_insert_sql(helper, len(chunk))
            params = self._flatten_rows(chunk, helper)
            self._execute(storage, sql, params)
            total += len(chunk)
        return total

    def batch_upsert(self, storage, helper, rows, pk_columns) -> int:
        """分批执行多行 INSERT ... ON DUPLICATE KEY UPDATE"""
        if not pk_columns:
            return self.batch_insert(storage, helper, rows)
        total = 0
        for chunk in self._chunks(rows, self.MAX_BATCH):
            sql = self._build_upsert_sql(helper, len(chunk), pk_columns)
            params = self._flatten_rows(chunk, helper)
            self._execute(storage, sql, params)
            total += len(chunk)
        return total

    def _build_insert_sql(self, helper, row_count):
        entity_helper = helper.get_entity_helper()
        columns = entity_helper.get_column_names()
        col_names = ', '.join(f'`{c}`' for c in columns)
        placeholders = ', '.join([
            f"({', '.join(['%s'] * len(columns))})"
            for _ in range(row_count)
        ])
        return f'INSERT INTO `{entity_helper.get_table_name()}` ({col_names}) VALUES {placeholders}'

    def _build_upsert_sql(self, helper, row_count, pk_columns):
        entity_helper = helper.get_entity_helper()
        columns = entity_helper.get_column_names()
        col_names = ', '.join(f'`{c}`' for c in columns)
        placeholders = ', '.join([
            f"({', '.join(['%s'] * len(columns))})"
            for _ in range(row_count)
        ])
        updates = ', '.join([
            f'`{c}` = VALUES(`{c}`)'
            for c in columns if c not in pk_columns
        ])
        return (
            f'INSERT INTO `{entity_helper.get_table_name()}` ({col_names}) '
            f'VALUES {placeholders} '
            f'ON DUPLICATE KEY UPDATE {updates}'
        )

    @staticmethod
    def _chunks(lst, n):
        for i in range(0, len(lst), n):
            yield lst[i:i + n]

    @staticmethod
    def _flatten_rows(rows, helper):
        entity_helper = helper.get_entity_helper()
        columns = entity_helper.get_column_names()
        params = []
        for row in rows:
            for col in columns:
                params.append(entity_helper.get_column_value(row, col))
        return params

    @staticmethod
    def _execute(storage, sql, params):
        conn = storage.get_raw_connection()
        cursor = conn.cursor()
        cursor.execute(sql, params)
        conn.commit()
```

### 5.5.3 Generic Adapter（降级）

```python
# adapters/generic.py
class GenericAdapter(BaseAdapter):
    """通用降级：多行 INSERT / 逐行 UPSERT"""

    def batch_insert(self, storage, helper, rows) -> int:
        storage.insert_all(rows, helper.get_entity_helper())
        return len(rows)

    def batch_upsert(self, storage, helper, rows, pk_columns) -> int:
        if not pk_columns:
            return self.batch_insert(storage, helper, rows)
        entity_helper = helper.get_entity_helper()
        for row in rows:
            storage.upsert_one(row, entity_helper)
        return len(rows)
```

### 5.5.4 性能对比

| 策略              | PostgreSQL            | MySQL         | 通用 RDBMS     |
| ----------------- | --------------------- | ------------- | -------------- |
| INSERT (2,000 条) | ~27ms (COPY)          | ~180ms (多行) | ~300ms         |
| UPSERT (2,000 条) | ~34ms (COPY + 临时表) | ~200ms (多行) | ~1000ms (逐行) |
| 相对逐行 INSERT   | **37x**               | **5x**        | **3x**         |
| 相对逐行 UPSERT   | **30x**               | **10x**       | **1x**         |

### 5.6 配置模型 (`settings.py`)

```python
from typing import List
from watchmen_model.common import SettingsModel

class BatchWriterSettings(SettingsModel):
    bootstrapServers: str = "localhost:9092"
    topics: List[str] = []
    consumerGroup: str = "watchmen-batch-writer"

    pat: str = ""                     # Personal Access Token，用于关联租户

    soft_delete_field: str = "is_deleted"   # 软删除标记字段名
    soft_delete_value: Any = 1              # 软删除标记值

    batchSize: int = 500             # 每组最大缓冲条数
    flushIntervalSec: int = 5        # 定时刷新间隔（秒）

    maxRetries: int = 3              # 写入失败重试次数
    retryDelaySec: float = 1.0       # 重试间隔（秒）
```

### 5.7 启动入口 (`__main__.py`)

```python
import asyncio
import os
import signal
from watchmen_batch_writer.settings import BatchWriterSettings
from watchmen_batch_writer.writer import BatchTopicWriter
from watchmen_batch_writer.accumulator import BatchAccumulator
from watchmen_batch_writer.config_loader import ConfigLoader
from watchmen_batch_writer.consumer import consume
from watchmen_batch_writer.health import start_health_server
from watchmen_rest import get_principal_by_pat, retrieve_authentication_manager
from watchmen_rest.authentication import build_authentication_manager, register_authentication_manager
from watchmen_meta.auth import build_find_user_by_name, build_find_user_by_pat
from watchmen_model.admin import UserRole
from watchmen_rest_doll.settings import RestSettings

async def main():
    # 初始化认证管理器（必须在 get_principal_by_pat 之前）
    rest_settings = RestSettings()
    register_authentication_manager(
        build_authentication_manager(
            rest_settings,
            build_find_user_by_name(),
            build_find_user_by_pat(),
            []
        )
    )

    settings = BatchWriterSettings(
        bootstrapServers=os.getenv("KAFKA_BOOTSTRAP_SERVERS"),
        topics=os.getenv("KAFKA_TOPICS", "").split(","),
        consumerGroup=os.getenv("KAFKA_CONSUMER_GROUP", "watchmen-batch-writer"),
        batchSize=int(os.getenv("BATCH_SIZE", "500")),
        flushIntervalSec=int(os.getenv("FLUSH_INTERVAL_SEC", "5")),
        pat=os.getenv("WATCHMEN_PAT", ""),
        soft_delete_field=os.getenv("SOFT_DELETE_FIELD", "is_deleted"),
        soft_delete_value=int(os.getenv("SOFT_DELETE_VALUE", "1")),
    )

    # 通过 PAT 认证获取 principal_service，tenantId 自动绑定
    principal_service = get_principal_by_pat(
        retrieve_authentication_manager(), settings.pat,
        [UserRole.ADMIN, UserRole.SUPER_ADMIN]
    )
    tenant_id = principal_service.tenantId

    config_loader = ConfigLoader(principal_service)

    writer = BatchTopicWriter(
        config_loader=config_loader,
        soft_delete_field=settings.soft_delete_field,
        soft_delete_value=settings.soft_delete_value,
        max_retries=settings.maxRetries,
        retry_delay=settings.retryDelaySec
    )
    accumulator = BatchAccumulator(
        writer=writer,
        tenant_id=tenant_id,
        batch_size=settings.batchSize,
        flush_interval=settings.flushIntervalSec
    )

    # 启动健康检查 HTTP server
    health_port = int(os.getenv("HEALTH_PORT", "9090"))
    start_health_server(accumulator, consumer, health_port)

    # 优雅关闭
    shutdown_event = asyncio.Event()
    loop = asyncio.get_event_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, lambda: shutdown_event.set())

    # 启动定时 flush 和 Kafka 消费
    flush_task = asyncio.create_task(accumulator.periodic_flush())
    consume_task = asyncio.create_task(consume(settings, accumulator))

    # 等待关闭信号
    await shutdown_event.wait()

    # Step 1: 停止定时 flush
    flush_task.cancel()

    # Step 2: 排空所有缓冲区
    await accumulator.flush_all()
    logger.info("All buffers flushed")

    # Step 3: 停止 consumer 并提交 offset
    await consumer.stop()
    logger.info("Consumer stopped, offset committed")

    # Step 4: 等待消费任务结束
    await consume_task
    logger.info("Shutdown complete")

if __name__ == "__main__":
    asyncio.run(main())
```

## 6. 错误处理

| 场景                         | 处理策略                                                                   |
| ---------------------------- | -------------------------------------------------------------------------- |
| Kafka 消息解析失败           | 记录错误日志，跳过该消息，继续消费                                         |
| Raw topic schema 找不到      | 记录错误，跳过该批次；不阻塞其他 topic 写入                                |
| Pipeline 映射找不到          | 记录错误，跳过该批次；可能该 raw topic 尚未配置 pipeline                   |
| ODS topic schema 找不到      | 记录错误，跳过该批次                                                       |
| 字段映射转换失败（单条）     | 记录错误，跳过该条数据，不影响同批次其他数据                               |
| PostgreSQL COPY 写入失败     | 重试 `maxRetries` 次；全部失败则抛异常（消费者停止，重启后从 offset 恢复） |
| PostgreSQL 临时表 MERGE 失败 | 回滚事务，清理临时表，重试；全部失败则抛异常                               |
| MySQL 多行 INSERT 失败       | 重试 `maxRetries` 次；全部失败则抛异常                                     |
| 通用 Adapter insert_all 失败 | 同上重试策略                                                               |
| Kafka 连接断开               | 自动重连（递归重连 + consumer group rebalance）                            |
| 进程崩溃                     | Kafka offset 未提交，重启后从上次提交位置重新消费（at-least-once）         |
| 单条数据 prepare_data 失败   | 记录错误，跳过该条，不影响同批次其他数据                                   |

## 7. 与现有系统关系

```
现有完整 CDC 链路（重型）：
┌──────────┐    ┌───────────┐    ┌──────────────────┐    ┌──────────┐    ┌─────────┐
│ Source   │───▶│ Collector │───▶│ change_data_record│───▶│ change_  │───▶│Pipeline │
│ DB       │    │ (extract) │    │ → change_data_json│    │ data_json│    │ → Topic │
└──────────┘    └───────────┘    └──────────────────┘    └──────────┘    └─────────┘

新模块链路（轻量，复用 ingest 配置 + pipeline 映射）：
┌───────────┐    ┌──────────┐    ┌──────────────────────────────────┐    ┌───────────┐
│ logbase   │───▶│  Kafka   │───▶│ batch-writer                      │───▶│ ODS Topic │
│ CDC 数据  │    │  Topic   │    │ · 加载 ingest table 配置          │    │ (存储)    │
└───────────┘    └──────────┘    │ · 加载 pipeline 映射              │    └───────────┘
                                 │ · 字段映射转换                    │
                                 │ · COPY + 临时表 UPSERT            │
                                 │ · 无管道触发                      │
                                 └──────────────────────────────────┘
```

两者可共存，batch-writer 适用于：

- 仅需将 CDC 数据批量同步到 ODS 层存储
- 不需要触发数据清洗/转换管道
- 复用已有的 ingest table 配置和 pipeline 字段映射
- 对写入吞吐量有较高要求（支持 INSERT + UPDATE）

## 8. 部署方式

### 8.1 Docker

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY packages/watchmen-batch-writer /app
RUN pip install .
CMD ["python", "-m", "watchmen_batch_writer"]
```

### 8.2 Kubernetes / 独立进程

通过环境变量配置：

```bash
KAFKA_BOOTSTRAP_SERVERS=broker1:9092,broker2:9092
KAFKA_TOPICS=logbase_cdc_topic
KAFKA_CONSUMER_GROUP=watchmen-batch-writer
BATCH_SIZE=500
FLUSH_INTERVAL_SEC=5
```

支持多实例水平扩展（利用 Kafka consumer group 分区分配）。

## 9. 依赖

`pyproject.toml` 核心依赖：

```toml
[tool.poetry.dependencies]
python = "~3.12"
watchmen-data-kernel = { path = "../watchmen-data-kernel", develop = true }
watchmen-meta = { path = "../watchmen-meta", develop = true }
watchmen-model = { path = "../watchmen-model", develop = true }
watchmen-collector-kernel = { path = "../watchmen-collector-kernel", develop = true }
aiokafka = "^0.11.0"
```

## 10. 实施步骤

| 步骤 | 内容                            | 产出                                             |
| ---- | ------------------------------- | ------------------------------------------------ |
| 1    | 创建包骨架                      | `pyproject.toml` + 目录结构                      |
| 2    | 实现 `model.py` + `settings.py` | 消息模型和配置模型（含 PAT、软删除）             |
| 3    | 实现 `config_loader.py`         | 加载 ingest 配置 + pipeline 映射（单源到单目标） |
| 4    | 实现 `writer.py`                | 核心写入逻辑（字段映射 + COPY/UPSERT + 软删除）  |
| 5    | 实现 `accumulator.py`           | 缓冲 + 分组 + 排序 + offset 追踪 + 双阈值 flush  |
| 6    | 实现 `consumer.py`              | Kafka 消费和解析（aiokafka）                     |
| 7    | 实现 `metrics.py` + `health.py` | Prometheus 指标 + 健康检查端点                   |
| 8    | 实现 `__main__.py`              | 启动入口 + 优雅关闭（SIGTERM drain）             |
| 9    | 编写测试 + 集成验证             | 确保写入正确、顺序保持、管道不被触发             |
| 10   | Docker 化                       | Dockerfile + K8s 部署配置（含健康检查探针）      |

## 11. 待解决的问题

以下问题需要在设计评审或实现前确认：

### 11.1 tenantId 来源 ✅ 已确认

Canal 消息格式中没有 `tenantId` 字段。

**决定**：采用 **PAT 认证** 方案。服务启动时配置 PAT（Personal Access Token），通过 PAT 关联到租户。`principal_service` 初始化后自动携带 `tenantId`，后续所有操作（分组缓冲、配置查找、数据写入）都使用该 `tenantId`。

这意味着：

- **每个 batch-writer 实例服务一个租户**，多租户 = 多实例（每个实例配置不同的 PAT）
- `tenantId` 是服务级别配置，**不在 Kafka 消息中携带**
- accumulator 分组键简化为 `(table)`（单租户无需 `tenantId` 维度的区分），或保留 `(table, tenantId)` 以保持一致性

```python
# settings.py 新增
pat: str = ""   # Personal Access Token，服务启动时通过环境变量或配置文件注入

# __main__.py 中根据 PAT 初始化 principal_service
principal_service = get_principal_by_pat(
    retrieve_authentication_manager(), settings.pat,
    [UserRole.ADMIN, UserRole.SUPER_ADMIN]
)
# principal_service.tenantId 自动可用
```

### 11.2 DELETE 处理策略 ✅ 已确认

**决定**：采用**软删除（flag 标记）**策略。对 DELETE 操作不跳过，而是设置软删除标记字段（如 `is_deleted = 1` 或 `_deleted_at = now()`），保留数据历史。

**实现要点**：

- pipeline mapping 中需配置软删除标记字段（`_is_deleted` 或 `_deleted_at`）
- DELETE 消息使用 `old` 数组中的主键值作为 UPSERT 行的标识
- 通过 `ON CONFLICT (pk) DO UPDATE SET is_deleted=1` 执行软删除
- 配置中指定软删除标记列名，如 pipeline 未配置则记录警告并跳过 DELETE

```python
# settings.py 新增
soft_delete_field: str = "is_deleted"   # 软删除标记字段名
soft_delete_value: Any = 1              # 标记值

# writer.py 中 DELETE 处理
async def _write_delete_batch(self, table, tenant_id, messages, ...):
    """DELETE: 使用 old 数据 + 设置软删除标记"""
    transformed = []
    for msg in messages:
        for old_row in msg.old:
            if old_row:
                row = dict(old_row)
                row[self.soft_delete_field] = self.soft_delete_value
                transformed.append(row)
    # 执行 UPSERT（用 old 中的主键定位行，设置 is_deleted 标记）
    self._prepare_and_copy_upsert(storage, transformed, ...)
```

### 11.3 多 Pipeline / 多目标 Topic ✅ 已确认

**决定**：本场景只处理**一个 source table 到一个 ODS table** 的单向映射。不处理一个 raw topic 写入多个 ODS topic 的复杂场景。

- `_get_or_load_mapping()` 取 `mappings[0]`：逻辑不变
- 如未来需要多目标写入，可扩展为 `write_batch` 循环写入多个 ODS topic

### 11.4 消息顺序性 ✅ 已确认

**决定**：需要保持消息顺序。CDC 数据要求同一主键的变更严格按顺序处理（INSERT → UPDATE → DELETE）。

**实现方案**：**单一 partition 消费 + 批次内按 binlog position 排序**

- Kafka 生产者将同一源表的 CDC 消息发送到同一 partition（partition key = `table`）
- Consumer 单 partition 顺序消费，天然保证同一 batch 内的消息顺次到达
- flush 前按 `msg.id`（binlog position）排序，确保批次内严格保序

```python
# accumulator.py 中 flush 前排序
async def _flush_key(self, key: str):
    messages = self.buffers.pop(key, [])
    if messages:
        # 按 binlog position 排序，保证顺序
        messages.sort(key=lambda m: m.id or 0)
        await self.writer.write_batch(key, self.tenant_id, messages)
```

**前提条件**：上游 Kafka producer 必须将同一源表的 CDC 消息发送到同一 partition。

### 11.5 幂等性 ✅ 已确认

**决定**：需要保持幂等。UPSERT 模式（`ON CONFLICT ... DO UPDATE`）天然支持幂等写入——同主键重复执行 UPSERT 结果一致。

- at-least-once 语义：进程崩溃后从上次提交的 offset 重新消费
- `ON CONFLICT (pk) DO UPDATE` 对重复数据不会产生副作用
- INSERT 模式同样使用 `ON CONFLICT DO NOTHING` 保证幂等
- 软删除同样幂等：重复 DELETE 的结果相同（`is_deleted=1`）

### 11.6 缓存失效 ✅ 已确认

**决定**：不需要考虑缓存失效。pipeline 配置变更频率低，缓存生命周期与进程一致即可。

- 如需更新配置，重启 batch-writer 实例即可重新加载
- 在 K8s 环境下通过滚动更新实现零中断配置刷新

### 11.7 监控与可观测性 ✅ 已确认

**决定**：需要提供监控能力，复用现有基础设施。

#### 7.1 复用现有基础设施

项目已集成以下监控组件，可直接复用：

| 组件                                 | 位置                                                                                                                                                 | 用途                                      |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **starlette_prometheus**             | [prometheus.py](file:///Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-rest/src/watchmen_rest/prometheus.py)                         | Prometheus middleware，自动收集 HTTP 指标 |
| **FastAPI**                          | [rest_app.py](file:///Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-rest/src/watchmen_rest/rest_app.py#L31-L43)                     | 已有 `/metrics` 端点和 CORS/MDC 中间件    |
| **MDC（Mapped Diagnostic Context）** | [mdc_middleware.py](file:///Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-rest/src/watchmen_rest/logger/mdc_middleware.py)          | 结构化日志上下文，支持 tenant 追踪        |
| **Observability 数据模型**           | [observability.ts](file:///Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-next-client/src/models/observability.ts)                   | 前端全链路可观测节点/边/事件模型          |
| **APScheduler**                      | [scheduler.py](file:///Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-collector-surface/src/watchmen_collector_surface/scheduler.py) | 后台定时任务（如定期健康检查上报）        |

#### 7.2 新增指标

为 batch-writer 添加以下 Prometheus 指标：

```python
# metrics.py
from prometheus_client import Counter, Gauge, Histogram, start_http_server

# 写入吞吐量
batch_rows_total = Counter(
    'watchmen_batch_writer_rows_total',
    'Total rows written',
    ['table', 'tenant_id', 'operation']
)

batch_writes_total = Counter(
    'watchmen_batch_writer_writes_total',
    'Total batch write operations',
    ['table', 'status']  # status: success / failed
)

batch_write_errors_total = Counter(
    'watchmen_batch_writer_errors_total',
    'Total write errors',
    ['table', 'error_type']  # transform_error / db_error / config_error
)

# 写入延迟
batch_write_latency = Histogram(
    'watchmen_batch_writer_write_latency_seconds',
    'Batch write latency',
    ['table'],
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 5.0, 10.0]
)

# 缓冲区状态
batch_buffer_size = Gauge(
    'watchmen_batch_writer_buffer_size',
    'Current buffer size per table',
    ['table']
)

# Kafka 消费指标
consumer_lag = Gauge(
    'watchmen_batch_writer_consumer_lag',
    'Kafka consumer lag per partition',
    ['topic', 'partition']
)

consumer_messages_consumed = Counter(
    'watchmen_batch_writer_messages_consumed_total',
    'Total Kafka messages consumed',
    ['topic']
)
```

#### 7.3 健康检查端点

在 batch-writer 中启动轻量 HTTP server，暴露 `/health` 和 `/metrics`：

```python
# health.py
from fastapi import FastAPI
from starlette_prometheus import PrometheusMiddleware, metrics

app = FastAPI()

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "buffers": {k: len(v) for k, v in accumulator.buffers.items()},
        "consumer_connected": consumer.is_connected()
    }

@app.get("/metrics")
async def prometheus_metrics():
    return metrics()

def start_health_server(port: int = 9090):
    import uvicorn
    app.add_middleware(PrometheusMiddleware)
    uvicorn.run(app, host="0.0.0.0", port=port)
```

#### 7.4 结构化日志

复用项目 MDC 模式，每条日志携带 `tenant` 和 `table` 上下文：

```python
# logger 集成
from watchmen_rest.logger import mdc_put, mdc_clear

mdc_put("tenant", tenant_id)
mdc_put("table", table)
logger.info(f"Batch write: rows={len(rows)}, op={operation}, "
            f"latency={elapsed:.3f}s")
mdc_clear()
```

#### 7.5 可观测性集成方案

```
┌──────────────────────────────────────────────┐
│              Batch Writer 实例               │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Consumer │  │  Writer  │  │  Health   │  │
│  │          │  │          │  │  Server   │  │
│  │ counter  │  │ counter  │  │ /health   │  │
│  │   lag    │  │ latency  │  │ /metrics  │  │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  │
│       │             │              │         │
│       └──────┬──────┴──────┬───────┘         │
│              │             │                  │
│       ┌──────▼─────────────▼──────┐          │
│       │    Prometheus Metrics     │          │
│       │    + Structured Logs      │          │
│       └──────────┬────────────────┘          │
└──────────────────┼───────────────────────────┘
                   │
    ┌──────────────┼──────────────┐
    ▼              ▼              ▼
┌───────┐    ┌──────────┐   ┌──────────┐
│Grafana│    │AlertMgr  │   │Watchmen  │
│Dashboard  │          │   │Observe   │
│         │    │          │   │(链路追踪)│
└───────┘    └──────────┘   └──────────┘
```

### 11.8 优雅关闭 ✅ 已确认

**决定**：需要优雅关闭。K8s 滚动更新或手动停止时，保证缓冲区数据不丢失。

**实现方案**：捕获 SIGTERM/SIGINT → flush 所有缓冲 → 停止 consumer → 提交 offset → 退出

```python
# __main__.py
import signal

async def main():
    # ... 初始化 accumulator, consumer ...

    shutdown_event = asyncio.Event()

    def signal_handler():
        logger.info("Received shutdown signal, draining buffers...")
        shutdown_event.set()

    loop = asyncio.get_event_loop()
    loop.add_signal_handler(signal.SIGTERM, signal_handler)
    loop.add_signal_handler(signal.SIGINT, signal_handler)

    # 启动定时 flush 和 Kafka 消费
    flush_task = asyncio.create_task(accumulator.periodic_flush())
    consume_task = asyncio.create_task(consumer.run())

    # 等待关闭信号
    await shutdown_event.wait()

    # Step 1: 停止定时 flush
    flush_task.cancel()

    # Step 2: 排空所有缓冲区
    await accumulator.flush_all()
    logger.info("All buffers flushed")

    # Step 3: 停止 consumer 并提交 offset
    await consumer.stop()
    logger.info("Consumer stopped, offset committed")

    # Step 4: 等待消费任务结束
    await consume_task
    logger.info("Shutdown complete")


class BatchAccumulator:
    async def flush_all(self):
        """优雅关闭：flush 所有缓冲表"""
        async with self.lock:
            keys = list(self.buffers.keys())
            for key in keys:
                await self._flush_key(key)
```

**K8s 配置建议**：

```yaml
spec:
    terminationGracePeriodSeconds: 60 # 给足够时间排空缓冲区
    containers:
        - lifecycle:
              preStop:
                  exec:
                      command: ["/bin/sh", "-c", "sleep 5"] # 等待 endpoint 摘除
```

### 11.9 Offset 提交时机 ✅ 已确认

**决定**：需要在 `write_batch` 成功后提交 offset。

**实现方案**：

- 每条 Kafka 消息携带 `topic_partition + offset`
- Accumulator 缓冲时记录对应的 offset 信息
- `_flush_key` 成功后，对该 partition 提交已处理的最大 offset

```python
# accumulator.py 中记录 offset
class BatchAccumulator:
    def __init__(self, ...):
        ...
        self._offsets: Dict[str, int] = {}  # key → max offset

    async def add(self, message: CanalCDCMessage, tp: TopicPartition, offset: int):
        key = message.table
        async with self.lock:
            self.buffers[key].append(message)
            # 记录该分组的最大 offset
            self._offsets[key] = max(self._offsets.get(key, -1), offset)
            if len(self.buffers[key]) >= self.batch_size:
                await self._flush_key(key)

    async def _flush_key(self, key: str):
        messages = self.buffers.pop(key, [])
        if messages:
            # 按 binlog position 排序
            messages.sort(key=lambda m: m.id or 0)
            try:
                await self.writer.write_batch(key, self.tenant_id, messages)
                # 写入成功 → 提交 offset
                await self._commit_offset(key)
            except Exception:
                # 写入失败 → 不提交 offset，消息重新放回缓冲区
                async with self.lock:
                    self.buffers[key] = messages + self.buffers.get(key, [])
                raise

    async def _commit_offset(self, key: str):
        """提交该分组的 offset"""
        offset = self._offsets.pop(key, None)
        if offset is not None:
            await self.consumer.commit({self._partition_map[key]: offset + 1})
```

**关键原则**：写入成功后才提交 offset，写入失败不提交（消息放回缓冲区重试），保证 at-least-once 语义。

### 11.10 database 字段处理 ✅ 已确认

**决定**：不需要 `database + table` 联合查找。当前场景下数据库名不参与配置查找，仅通过 `table` 字段匹配 CollectorTableConfig。后续如有同名表冲突需求再扩展。
