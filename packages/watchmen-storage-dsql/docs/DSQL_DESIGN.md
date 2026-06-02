# AWS Aurora DSQL 存储集成设计方案

## 1. 背景与目标

### 1.1 为什么选择 AWS Aurora DSQL

AWS Aurora DSQL 是 Amazon 推出的分布式 SQL 数据库，具备以下特点：
- **PostgreSQL 兼容**：采用 `psycopg2` 驱动连接，复用 PostgreSQL 生态
- **分布式架构**：数据自动分片，无需手动管理分区
- **强一致性**：支持 ACID 事务
- **主键即分区键**：DSQL 自动使用表的主键作为 shard key（distribution key）
- **无自增 ID**：DSQL 不支持自增序列（SERIAL/BIGSERIAL），需要应用层生成主键

### 1.2 目标

在 Watchmen 中新增 `DataSourceType.DSQL` 数据源类型，使 topic 数据能够存储到 AWS Aurora DSQL 中。

---

## 2. 架构概览

```
┌──────────────────────────────────────────────────────────┐
│                    watchmen-web-client                     │
│  DataSourceType.DSQL = 'dsql'  →  下拉选项 "AWS DSQL"     │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│                   watchmen-data-kernel                     │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ topic_storage.py: build_dsql_storage()              │ │
│  │   → StorageDSQLConfiguration → TopicDataStorageDSQL │ │
│  └─────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ data_service.py: _generate_id()                     │ │
│  │   if DSQL → uuid4().hex (32位)                     │ │
│  │   else    → Snowflake BIGINT                        │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│                   watchmen-storage-dsql                    │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ data_source_dsql.py                                 │ │
│  │   - DSQLDataSourceHelper (引擎管理)                   │ │
│  │   - DSQLDataSourceParams (连接参数)                   │ │
│  ├─────────────────────────────────────────────────────┤ │
│  │ storage_dsql.py                                     │ │
│  │   - StorageDSQL (CRUD 操作)                          │ │
│  │   - TopicDataStorageDSQL (topic 表管理)              │ │
│  ├─────────────────────────────────────────────────────┤ │
│  │ table_creator.py                                    │ │
│  │   - id_ VARCHAR(64) PRIMARY KEY  (UUID 主键)        │ │
│  │   - 列类型映射、索引生成                               │ │
│  ├─────────────────────────────────────────────────────┤ │
│  │ script_builder_dsql.py                               │ │
│  │   - ScriptBuilderDSQL (DDL/DML 脚本生成)             │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## 3. 核心设计决策

### 3.1 主键策略：UUID 替代 Snowflake BIGINT

| 对比维度 | Snowflake BIGINT（当前） | UUID（DSQL） |
|---------|------------------------|-------------|
| 类型 | 64位整数 | 128位（32字符十六进制） |
| 生成方式 | `ask_snowflake_generator()` | `uuid4().hex` |
| 分布式友好 | 需要中心化 ID 服务 | 各节点独立生成，天然无冲突 |
| DSQL 兼容 | **不支持**（无自增/序列） | **支持**（字符串主键，DSQL 自动分片） |
| 存储空间 | 8 bytes | 32 bytes（VARCHAR(64)） |

**决策**：DSQL 数据源使用 UUID 主键，其他数据源（MySQL/Oracle/PostgreSQL 等）保持 Snowflake BIGINT 不变。

### 3.2 条件 ID 生成

在 `TopicDataService` 中新增 `_generate_id()` 方法，根据数据源类型选择 ID 生成策略：

```
插入数据
  │
  ▼
TopicDataService._generate_id()
  │
  ├─ _ask_data_source_type() == DSQL
  │     → uuid4().hex  (如: a1b2c3d4e5f6789012345678901234ab)
  │
  └─ 其他
        → snowflakeGenerator.next_id()  (如: 1234567890123456789)
```

**查询链路**：`topic.dataSourceId` → `CacheService.data_source().get()` → `DataSource.dataSourceType`

### 3.3 DSQL 分区键 = 主键

Aurora DSQL 规定：
- **主键即 shard key**，无法手动指定分区键
- 查询通过主键路由到正确的分片
- 跨分片查询通过 Global Secondary Index（全局二级索引）支持

因此表结构使用 `id_ VARCHAR(64) PRIMARY KEY`，DSQL 自动以 `id_` 为 distribution key 进行数据分片。

---

## 4. 文件变更清单

### 4.1 新增文件

| 文件 | 说明 |
|------|------|
| `packages/watchmen-storage-dsql/pyproject.toml` | DSQL 包定义，依赖 `psycopg2-binary` + `watchmen-storage-rds` |
| `packages/watchmen-storage-dsql/src/watchmen_storage_dsql/__init__.py` | 导出 `DSQLDataSourceHelper`, `StorageDSQL`, `TopicDataStorageDSQL`, `StorageDSQLConfiguration`, `ScriptBuilderDSQL` |
| `packages/watchmen-storage-dsql/src/watchmen_storage_dsql/data_source_dsql.py` | 引擎工厂、连接 URL 构建（`postgresql+psycopg2://`）、参数管理 |
| `packages/watchmen-storage-dsql/src/watchmen_storage_dsql/storage_dsql.py` | `StorageDSQL`（继承 `StorageRDS`）+ `TopicDataStorageDSQL`（表 CRUD、元数据反射） |
| `packages/watchmen-storage-dsql/src/watchmen_storage_dsql/storage_dsql_configuration.py` | `Configuration` 构建器（Fluent API）+ `StorageDSQLConfiguration` |
| `packages/watchmen-storage-dsql/src/watchmen_storage_dsql/table_creator.py` | DDL 生成：`id_ VARCHAR(64)`, 字段类型映射, 索引生成 |
| `packages/watchmen-storage-dsql/src/watchmen_storage_dsql/script_builder_dsql.py` | DML 脚本生成（INSERT/UPDATE/CREATE TABLE/ALTER TABLE） |

### 4.2 修改文件

| 文件 | 修改内容 |
|------|---------|
| **Model 层** | |
| `watchmen-model/.../system/data_source.py` | 新增 `DataSourceType.DSQL = 'dsql'` |
| `watchmen-model/.../pipeline_kernel/pipeline_monitor_log.py` | `dataId: Optional[int]` → `Optional[Union[int, str]]` |
| **Data Kernel 层** | |
| `watchmen-data-kernel/.../storage/topic_storage.py` | 新增 `build_dsql_storage()` + `DSQL` 路由分支 |
| `watchmen-data-kernel/.../storage/data_entity_helper.py` | ID 类型 `int` → `Any`；`assign_fix_columns_on_create` 参数 `snowflake_generator` → `id_value` |
| `watchmen-data-kernel/.../storage/data_service.py` | 新增 `_ask_data_source_type()` + `_generate_id()`；`TopicTrigger.internalDataId` 类型放宽 |
| **Pipeline Kernel 层** | |
| `watchmen-pipeline-kernel/.../pipeline_context.py` | `data_id: int` → `data_id: Any` |
| `watchmen-pipeline-kernel/.../compiled_pipeline.py`（接口+实现） | `data_id: int` → `data_id: Any` |
| `watchmen-pipeline-kernel/.../monitor_log_data_service.py` | `data_id: int` → `data_id: Any` |
| **Pipeline Surface 层** | |
| `watchmen-pipeline-surface/.../topic_trigger_router.py` | `data_id: int` → `data_id: Union[int, str]` |
| **Web Client 层** | |
| `watchmen-web-client/.../data-source-types.ts` | 新增 `DSQL = "dsql"` |
| `watchmen-web-client/.../data-source-type-input.tsx` | 新增 `{value: DataSourceType.DSQL, label: 'AWS DSQL'}` |

---

## 5. 表结构 DDL

```sql
CREATE TABLE t_topic_name (
    id_              VARCHAR(64),          -- UUID 主键（32位十六进制，无连字符）
    factor_1         VARCHAR(255),         -- 业务字段
    factor_2         DECIMAL(32,6),        -- 业务字段
    ...
    aggregate_assist_ JSON,                -- 聚合辅助列（仅聚合 topic）
    version_         INTEGER,              -- 版本号（仅聚合 topic）
    tenant_id_       VARCHAR(50),          -- 租户 ID
    insert_time_     TIMESTAMP,            -- 插入时间
    update_time_     TIMESTAMP,            -- 更新时间
    CONSTRAINT pk_t_topic_name PRIMARY KEY (id_)
);

-- 业务唯一索引
CREATE UNIQUE INDEX u_t_topic_name_1 ON t_topic_name (factor_1);

-- 业务普通索引
CREATE INDEX i_t_topic_name_1 ON t_topic_name (factor_2);

-- 系统索引
CREATE INDEX i_t_topic_name_tenant_id_ ON t_topic_name (tenant_id_);
CREATE INDEX i_t_topic_name_insert_time_ ON t_topic_name (insert_time_);
CREATE INDEX i_t_topic_name_update_time_ ON t_topic_name (update_time_);
```

**关键差异**（与 PostgreSQL/MySQL 对比）：

| 特征 | PostgreSQL/MySQL | DSQL |
|------|-----------------|------|
| 主键类型 | `DECIMAL(20)` / `BIGINT` | `VARCHAR(64)` |
| 主键值 | Snowflake 整数 | UUID 字符串 |
| 自增支持 | 支持 SERIAL | **不支持** |
| 分区键 | 无需分区（单机） | 主键自动作为 shard key |

---

## 6. 数据流

### 6.1 插入数据

```
用户/API 提交数据
  │
  ▼
TopicDataService.trigger_by_insert(data)
  │
  ├─ _generate_id()
  │   ├─ DSQL → uuid4().hex = "a1b2c3..."
  │   └─ 其他 → snowflakeGenerator.next_id() = 1234567890...
  │
  ├─ assign_fix_columns_on_create(data, id_value, ...)
  │   ├─ data[id_] = id_value
  │   ├─ data[tenant_id_] = tenant_id
  │   └─ data[insert_time_/update_time_/version_] = ...
  │
  ▼
TopicDataStorageDSQL.insert_one(topic_data)
  │
  ▼
DSQL 数据库：INSERT INTO t_topic VALUES (...)
  │
  ▼
返回 TopicTrigger(triggerType=INSERT, internalDataId="a1b2c3...")
  │
  ▼
Pipeline 触发（internalDataId 为 UUID 字符串）
```

### 6.2 更新/合并数据

```
用户提交数据（带 id_）
  │
  ▼
TopicDataService.trigger_by_merge(data)
  │
  ├─ find_data_id(data) → id_
  │   (id_ 可能是 int 或 str)
  │
  ├─ find_previous_data_by_id(id_)
  │   → storage.find_by_id(id_, ...)
  │   (EntityId = TypeVar('EntityId', str, int)，已兼容)
  │
  └─ 更新数据 + 记录 PipelineMonitorLog
      dataId = id_ (Union[int, str])
```

---

## 7. 兼容性说明

### 7.1 向后兼容

- 非 DSQL 数据源的 ID 生成逻辑**完全不变**，仍使用 Snowflake BIGINT
- `EntityId = TypeVar('EntityId', str, int)` 在 storage SPI 层始终支持字符串和整数 ID
- `TopicTrigger.internalDataId` 类型从 `int` 放宽为 `Any`，兼容所有下游消费

### 7.2 Pipeline Monitor Log 兼容

- `PipelineMonitorLog.dataId` 类型从 `Optional[int]` 改为 `Optional[Union[int, str]]`
- 现有 DDL 中 `dataid DECIMAL(20)` 列：当 data_id 为 UUID 字符串时，存储到 `topic_raw_pipeline_monitor_log` 表会需要列类型变更（**需要单独 DDL 迁移**，将 `dataid DECIMAL(20)` 改为 `VARCHAR(64)`）

### 7.3 连接驱动

- DSQL 使用 **psycopg2** 驱动（`postgresql+psycopg2://`），与 PostgreSQL 存储共享 SQL 方言
- URL 构建自动处理密码编码（`urllib.parse.quote_plus`）
- 支持连接池配置（`pool_size`, `max_overflow`, `pool_recycle`）

---

## 8. 部署配置

### 8.1 依赖安装

```bash
# 安装 DSQL 存储包
pip install watchmen-storage-dsql

# 或使用 poetry extras
poetry install -E dsql
```

### 8.2 数据源配置

在 Watchmen 管理界面创建 DSQL 数据源：

| 字段 | 值 |
|------|-----|
| Data Source Type | AWS DSQL |
| Host | `<dsql-cluster-endpoint>` |
| Port | `5432` |
| Username | `<db-user>` |
| Password | `<db-password>` |
| Schema | `<database-name>` |

---

## 9. 待办事项

1. **Pipeline Monitor Log DDL 迁移**：将 `topic_raw_pipeline_monitor_log.dataid` 列从 `DECIMAL(20)` 改为 `VARCHAR(64)`，以支持存储 UUID 格式的 data_id
2. **MetricFlow 配置**：确认 MetricFlow 是否支持 PostgreSQL 兼容的 DSQL 作为语义层数据源
3. **Collector 集成**：确认 CDC/Change Data Capture 组件是否需要适配 DSQL
4. **性能测试**：验证 UUID 主键在分布式查询场景下的性能表现
5. **连接池调优**：根据实际负载调整 `pool_size` 和 `pool_recycle` 参数