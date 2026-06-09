# 腾讯云 TDSQL MySQL 版存储集成设计方案

> 官方文档: https://cloud.tencent.com/document/product/557/8767（建表文档）
>
> 产品代码: dcdb (TDSQL MySQL版)
>
> 参考实现: `packages/watchmen-storage-dsql/docs/DSQL_DESIGN.md`

---

## 1. 背景与目标

### 1.1 TDSQL MySQL 版概述

TDSQL MySQL 版（又称 DCDB）是腾讯云自研的分布式数据库，基于 MySQL 协议，具备以下核心特性：

| 特性                | 说明                                                  |
| ------------------- | ----------------------------------------------------- |
| **高度 MySQL 兼容** | 兼容 MySQL 语法、数据类型、函数、事务等               |
| **自动水平拆分**    | 建表时指定 shardkey，自动将数据均匀分布到多个物理分片 |
| **读写分离**        | 支持读写分离，提升读性能                              |
| **弹性扩展**        | 支持在线扩容，数据自动迁移均衡                        |
| **强同步复制**      | 主从架构，确保数据强一致                              |

### 1.2 三种表类型

TDSQL 支持三种表类型，满足不同业务场景：

| 表类型     | 关键字                       | 数据分布                   | 适用场景                         |
| ---------- | ---------------------------- | -------------------------- | -------------------------------- |
| **分表**   | `shardkey=col`               | 按 shardkey 分布到所有 set | 大数据量、高并发事务表           |
| **单表**   | 无 shardkey                  | 全量存在第一个 set 中      | 小表，语法与 MySQL 完全一致      |
| **广播表** | `shardkey=noshardkey_allset` | 所有 set 中都有全量数据    | 小维表，通过分布式事务保证一致性 |

### 1.3 三种分区策略（一级分区）

| 分区类型  | 关键字                            | 支持字段类型                   | 适用场景                       |
| --------- | --------------------------------- | ------------------------------ | ------------------------------ |
| **HASH**  | `shardkey=col`                    | INT, BIGINT, CHAR, VARCHAR 等  | 高并发事务表，数据均匀分布     |
| **RANGE** | `TDSQL_DISTRIBUTED BY RANGE(col)` | DATE, DATETIME, INT, BIGINT 等 | 日志流水表，按范围分区便于归档 |
| **LIST**  | `TDSQL_DISTRIBUTED BY LIST(col)`  | INT, CHAR, VARCHAR 等          | 按离散值分区（如按省份）       |

> **注意**：内核 5.7 版本不支持 `TDSQL_DISTRIBUTED BY RANGE|LIST` 语法，仅 8.0+ 支持。

### 1.4 核心要求：分片键（shardkey）

TDSQL 分表 **必须指定分片键（shardkey）**，这是与 MySQL 最大的差异：

```sql
-- HASH 分表（最常用，正确语法）
CREATE TABLE orders (
    order_id BIGINT,
    tenant_id_ VARCHAR(50),
    amount DECIMAL(18, 4),
    insert_time_ DATETIME,
    update_time_ DATETIME,
    PRIMARY KEY (order_id, tenant_id_)
) SHARDKEY=tenant_id_ ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**关键规则：**

1. **分片键必须在主键中**（唯一索引也必须包含 shardkey）
2. 分片键决定数据分布
3. 查询不带分片键会触发全表扫描（广播到所有分片）

---

## 2. 架构概览

```
┌───────────────────────────────────────────────────────────────────┐
│                    watchmen-web-client                            │
│  DataSourceType.TDSQL = 'tdsql'  →  下拉选项 "TDSQL MySQL"    │
└──────────────────────────┬────────────────────────────────────────┘
                           │
┌──────────────────────────▼────────────────────────────────────────┐
│                    watchmen-data-kernel                           │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ topic_storage.py: build_tdsql_storage()                     │  │
│  │   → StorageTDSQLConfiguration → TopicDataStorageTDSQL       │  │
│  └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────┬────────────────────────────────────────┘
                           │
┌──────────────────────────▼────────────────────────────────────────┐
│                   watchmen-storage-tdsql                          │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ __init__.py                                                 │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │ data_source_tdsql.py                                        │  │
│  │   - TDSQLDataSourceParams, TDSQLDataSourceHelper            │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │ storage_tdsql.py                                            │  │
│  │   - StorageTDSQL, TopicDataStorageTDSQL                     │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │ storage_tdsql_configuration.py                              │  │
│  │   - StorageTDSQLConfiguration                                │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │ table_creator.py                                            │  │
│  │   - 生成带分片键的 DDL（支持 HASH/RANGE/LIST）              │  │
│  └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────────┘
                           │
┌──────────────────────────▼────────────────────────────────────────┐
│                    TDSQL MySQL 版集群                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │  分片1     │  │  分片2     │  │  分片N     │                │
│  │ 物理节点   │  │ 物理节点   │  │ 物理节点   │                │
│  └────────────┘  └────────────┘  └────────────┘                │
│         ↓              ↓              ↓                        │
│   tenant_id hash    tenant_id hash    tenant_id hash            │
└───────────────────────────────────────────────────────────────────┘
```

### 类继承关系

```
StorageSPI (ABC)
  └── TransactionalStorageSPI (ABC)
       └── TopicDataStorageSPI (ABC)

StorageRDS (TransactionalStorageSPI)     ← SQLAlchemy 基础实现
  └── StorageMySQL (StorageRDS)
       └── StorageTDSQL (StorageMySQL)  ← 扩展 DDL 生成

TopicDataStorageRDS (StorageRDS, TopicDataStorageSPI)
  └── TopicDataStorageMySQL (StorageMySQL, TopicDataStorageRDS)
       └── TopicDataStorageTDSQL (StorageTDSQL, TopicDataStorageMySQL)
```

---

## 3. 核心设计决策

### 3.1 分片策略：基于 Factor.keyType / Factor.keyIndex

**Watchmen 通过 Factor 模型中已有的 `keyType` / `keyIndex` 字段来标识分片键**，而**不是**写死 `tenant_id_`：

| Factor 字段 | 取值                      | 含义                             |
| ----------- | ------------------------- | -------------------------------- |
| `keyType`   | `FactorKeyType.PARTITION` | 该 Factor 参与分区（水平拆分）   |
| `keyType`   | `FactorKeyType.SORT`      | 该 Factor 仅用于排序，不参与分片 |
| `keyType`   | `FactorKeyType.NONE`      | 既不分区也不排序                 |
| `keyIndex`  | 整数（1、2、3...）        | 分片键在分区字段中的优先级       |

**分片键选取规则**：

1. 遍历 `topic.factors`，筛选 `keyType == FactorKeyType.PARTITION` 的因子；
2. 在筛选结果中取 **`keyIndex` 最小**的那一个（即 `keyIndex == 1` 的 Factor）作为 shardkey；
3. 若没有 `keyType == PARTITION` 的 Factor，则**回退**到 `tenant_id_`（保证 Watchmen 默认多租户隔离仍然生效）；
4. 业务侧应在 Topic 设计阶段显式指定 `keyType=PARTITION` + `keyIndex=1`，让 shardkey 反映真实业务分片维度（如租户、订单号、地区等）。

> **设计原则**：shardkey 是**业务字段**，不是数据库框架字段。把分片键的选择权交给 Topic 模型，使 Watchmen 在面对单租户大表（如按订单 ID 分片）时也能正确路由。

**shardkey 字段类型限制**（前端会强制校验，参考官方文档）：

| 允许作为 shardkey 的 FactorType  | 含义                                                     |
| -------------------------------- | -------------------------------------------------------- |
| `SEQUENCE`、`NUMBER`、`UNSIGNED` | 数值类型（TDSQL 支持 INT/BIGINT/DECIMAL）                |
| **不支持**                       | TEXT、JSON、OBJECT、ARRAY、DATE、TIME、DATETIME、BOOLEAN |

**Factor 模型参考**（`watchmen-model/src/watchmen_model/admin/factor.py`）：

```python
class FactorKeyType(str, Enum):
    NONE = '',
    PARTITION = 'partition',
    SORT = 'sort'


class Factor(ExtendedBaseModel, Storable):
    factorId: Optional[FactorId] = None
    type: Optional[FactorType] = None
    name: Optional[str] = None
    keyType: Optional[FactorKeyType] = None
    keyIndex: Optional[int] = None
    ...
```

**示例 Topic 定义**（订单表，以 `tenant_id_` 为主分片键）：

```python
Topic(
    name='orders',
    factors=[
        Factor(name='id', type=FactorType.SEQUENCE, ...),
        Factor(name='tenantId', type=FactorType.TEXT, keyType=FactorKeyType.PARTITION, keyIndex=1),
        Factor(name='orderNo', type=FactorType.TEXT, ...),
        Factor(name='amount', type=FactorType.NUMBER, ...),
        ...
    ]
)
# 生成的 DDL shardkey = tenant_id_  (即 'tenantId_')
```

**示例 Topic 定义**（按订单号分片的多租户场景）：

```python
Topic(
    name='order_items',
    factors=[
        Factor(name='id', type=FactorType.SEQUENCE, ...),
        Factor(name='tenantId', type=FactorType.TEXT, keyType=FactorKeyType.PARTITION, keyIndex=2),
        Factor(name='orderNo', type=FactorType.TEXT, keyType=FactorKeyType.PARTITION, keyIndex=1),
        ...
    ]
)
# 生成的 DDL shardkey = order_no_  (即 keyIndex 最小者优先)
```

### 3.2 主键设计

TDSQL 要求 **主键必须包含 shardkey**，采用复合主键：

```sql
-- 错误：主键不包含 shardkey（TDSQL 不支持）
CREATE TABLE topic_data_xxx (
    id_ BIGINT PRIMARY KEY,
    order_no_ VARCHAR(50),
    ...
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 正确：复合主键包含 shardkey
CREATE TABLE topic_data_xxx (
    id_ BIGINT,
    order_no_ VARCHAR(50),
    insert_time_ DATETIME,
    update_time_ DATETIME,
    ...
    PRIMARY KEY (id_, order_no_)
) SHARDKEY=order_no_ ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.3 DDL 语法规范（对齐官方文档）

TDSQL 的 DDL 语法与 MySQL 有差异，以下是官方文档确认的正确语法。

#### HASH 分表（默认，最常用）

```sql
CREATE TABLE topic_data_xxx (
    id_ BIGINT,
    tenant_id_ VARCHAR(50),
    insert_time_ DATETIME,
    update_time_ DATETIME,
    ...
    PRIMARY KEY (id_, tenant_id_)
) SHARDKEY=tenant_id_ ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### RANGE 分表

```sql
CREATE TABLE topic_data_xxx (
    id_ BIGINT,
    tenant_id_ VARCHAR(50),
    ...
    PRIMARY KEY (id_, tenant_id_)
) TDSQL_DISTRIBUTED BY RANGE(tenant_id_)
  (s1 VALUES LESS THAN (100),
   s2 VALUES LESS THAN (200),
   s3 VALUES LESS THAN (MAXVALUE))
  ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

> **注意**：`s1`、`s2` 是 set 别名，不能自定义，只能按顺序命名。

#### LIST 分表

```sql
CREATE TABLE topic_data_xxx (
    id_ BIGINT,
    tenant_id_ VARCHAR(50),
    ...
    PRIMARY KEY (id_, tenant_id_)
) TDSQL_DISTRIBUTED BY LIST(tenant_id_)
  (s1 VALUES IN (1, 3, 5),
   s2 VALUES IN (2, 4, 6),
   s3 VALUES IN (7, 8, 9))
  ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 单表（无分片，语法与 MySQL 完全一致）

```sql
CREATE TABLE topic_data_xxx (
    id_ BIGINT PRIMARY KEY,
    tenant_id_ VARCHAR(50),
    ...
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 广播表（所有分片全量数据）

```sql
CREATE TABLE topic_data_xxx (
    id_ BIGINT,
    tenant_id_ VARCHAR(50),
    ...
    PRIMARY KEY (id_, tenant_id_)
) SHARDKEY=noshardkey_allset ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.4 与 AWS DSQL 的对比

| 特性     | TDSQL MySQL                                 | AWS DSQL                   |
| -------- | ------------------------------------------- | -------------------------- |
| 协议     | MySQL                                       | PostgreSQL                 |
| 分片键   | 可指定任意列（`SHARDKEY=col`）              | 主键强制分片               |
| 主键类型 | BIGINT + tenant*id*                         | UUID                       |
| DDL 扩展 | `SHARDKEY=col` / `TDSQL_DISTRIBUTED BY ...` | `WITH (shard_key = '...')` |
| 分区类型 | HASH / RANGE / LIST                         | HASH only                  |

---

## 4. Shardkey 约束与注意事项

### 4.1 字段类型限制

shardkey 字段支持以下类型：

| 类型                                   | 说明                               |
| -------------------------------------- | ---------------------------------- |
| `INT`, `BIGINT`, `SMALLINT`, `TINYINT` | 数值类型，直接用于 hash 计算       |
| `CHAR`, `VARCHAR`                      | **必须定义长度**，如 `VARCHAR(50)` |
| `DECIMAL`, `FLOAT`                     | 数值类型                           |

**不支持的类型**：`TEXT`, `BLOB`, `JSON`, `DATE`（HASH 场景下不推荐）

### 4.2 关键约束

| 约束                          | 说明                   | 影响                          |
| ----------------------------- | ---------------------- | ----------------------------- |
| **主键必须包含 shardkey**     | 所有唯一索引也必须包含 | DDL 生成时必须检查            |
| **不能 UPDATE shardkey 字段** | 分片键的值不可修改     | 应用层需避免更新 tenant*id*   |
| **shardkey 值不能有中文**     | Proxy 不转换字符集     | VARCHAR shardkey 只能存 ASCII |
| **查询尽量带 shardkey**       | 不带会广播到所有分片   | 性能影响大，需避免            |

### 4.3 容量建议

| 指标           | 建议值       |
| -------------- | ------------ |
| 单分片容量     | ≤ 2TB        |
| 单分片分表行数 | ≤ 2 千万行   |
| 单表容量       | 10GB - 100GB |

### 4.4 RANGE/LIST 分区注意事项

- 分区别名 `s1`、`s2` **不能自定义**，只能按顺序命名
- `VALUES LESS THAN (MAXVALUE)` 可用于最后一个分区
- 内核 5.7 版本**不支持** RANGE/LIST 语法，需使用 8.0+ 内核

---

## 5. 文件变更清单

### 5.1 新增文件

| 文件                                                                                        | 说明             |
| ------------------------------------------------------------------------------------------- | ---------------- |
| `packages/watchmen-storage-tdsql/pyproject.toml`                                            | 包定义           |
| `packages/watchmen-storage-tdsql/src/watchmen_storage_tdsql/__init__.py`                    | 导出             |
| `packages/watchmen-storage-tdsql/src/watchmen_storage_tdsql/data_source_tdsql.py`           | 数据源配置       |
| `packages/watchmen-storage-tdsql/src/watchmen_storage_tdsql/storage_tdsql.py`               | 存储实现         |
| `packages/watchmen-storage-tdsql/src/watchmen_storage_tdsql/storage_tdsql_configuration.py` | 配置类           |
| `packages/watchmen-storage-tdsql/src/watchmen_storage_tdsql/table_creator.py`               | DDL 生成         |
| `packages/watchmen-storage-tdsql/docs/TDSQL_DESIGN.md`                                      | 设计文档（本文） |

### 5.2 修改文件

| 文件                                                                   | 修改内容                                                                                      |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `watchmen-model/.../data_source.py`                                    | 新增 `DataSourceType.TDSQL = 'tdsql'`                                                         |
| `watchmen-data-kernel/.../topic_storage.py`                            | 新增 `build_tdsql_storage()`                                                                  |
| `watchmen-web-client/.../data-source-types.ts`                         | 新增 `TDSQL = "tdsql"`                                                                        |
| `watchmen-web-client/.../data-source-type-input.tsx`                   | 新增下拉选项 "TDSQL MySQL"                                                                    |
| `watchmen-web-client/.../services/data/tuples/topic-utils.ts`          | `isKeyTypeSupported` 包含 `TDSQL`；新增 `isTdsql`、`isTdsqlShardkeySupported`                 |
| `watchmen-web-client/.../admin/topics/factor/factor-row.tsx`           | TDSQL 场景下 label 改为 "Sharding Key" / "Sharding Key Index"；传递 `dataSourceType` 给子组件 |
| `watchmen-web-client/.../admin/topics/factor/factor-key-type-cell.tsx` | TDSQL 场景下不合法类型时禁用 `Partition Key` 选项，并显示提示文案                             |

---

## 6. 代码骨架

### 6.1 `pyproject.toml`

```toml
[tool.poetry]
name = "watchmen-storage-tdsql"
version = "18.0.0"
description = "Tencent Cloud TDSQL MySQL storage for watchmen"
authors = ["botlikes <75356972+botlikes456@users.noreply.github.com>"]
license = "MIT"
packages = [{ include = "watchmen_storage_tdsql", from = "src" }]

[tool.poetry.dependencies]
python = "~3.12"
PyMySQL = "^1.1.1"
cryptography = "^42.0.8"
watchmen-storage-mysql = { path = "../watchmen-storage-mysql", develop = true }
watchmen-storage-rds = { path = "../watchmen-storage-rds", develop = true }

[build-system]
requires = ["poetry-core>=1.0.0"]
build-backend = "poetry.core.masonry.api"
```

### 6.2 `data_source_tdsql.py`

```python
from watchmen_model.system import DataSource
from .storage_tdsql import StorageTDSQL, TopicDataStorageTDSQL
from watchmen_storage_mysql.data_source_mysql import MySQLDataSourceHelper, MySQLDataSourceParams


class TDSQLDataSourceParams(MySQLDataSourceParams):
    """
    TDSQL MySQL 版连接参数。

    分片键不再由数据源配置指定，而是从 Topic.factors 中
    keyType=PARTITION + keyIndex 最小的字段推导（参见 table_creator.pick_shardkey）。
    """
    sharding_type: str = 'HASH'


class TDSQLDataSourceHelper(MySQLDataSourceHelper):
    """
    TDSQL MySQL 版数据源引擎工厂。

    TDSQL MySQL 版（DCDB）是腾讯云分布式数据库，支持自动水平拆分。
    建表时必须指定分片键（由 Topic 模型推导），数据根据分片键分布到多个物理节点。
    """

    def __init__(self, data_source: DataSource, params: TDSQLDataSourceParams = None):
        if params is None:
            params = TDSQLDataSourceParams()
        super().__init__(data_source, params)
        self.sharding_type = params.sharding_type

    def acquire_storage(self) -> StorageTDSQL:
        return StorageTDSQL(self.engine, self.sharding_type)

    def acquire_topic_data_storage(self) -> TopicDataStorageTDSQL:
        return TopicDataStorageTDSQL(self.engine, self.sharding_type)
```

### 6.3 `storage_tdsql.py`

```python
from sqlalchemy import text

from watchmen_model.admin import Topic
from watchmen_storage import as_table_name
from watchmen_storage_mysql.storage_mysql import StorageMySQL, TopicDataStorageMySQL
from .table_creator import (
    build_table_script, build_columns_script,
    build_indexes_script, build_unique_indexes_script,
)


class StorageTDSQL(StorageMySQL):
    """
    TDSQL MySQL 版存储实例。

    TDSQL MySQL 版是分布式数据库，建表时需要指定分片键。
    继承 MySQL 的所有 CRUD 实现，主要差异在 DDL 生成。
    """

    def __init__(self, engine, sharding_type: str = 'HASH'):
        super().__init__(engine)
        self.sharding_type = sharding_type


class TopicDataStorageTDSQL(StorageTDSQL, TopicDataStorageMySQL):
    """
    TDSQL MySQL 版 Topic 数据存储。

    分片键由 Topic.factors 中的 keyType=PARTITION 字段自动推导（参见 pick_shardkey）。
    重写 DDL 生成方法，添加分片键配置：
    - create_topic_entity: 生成带 SHARDKEY 的建表语句
    - update_topic_entity: 复用 MySQL 的列变更逻辑
    """

    # noqa: SqlResolve
    def create_topic_entity(self, topic: Topic) -> None:
        from logging import getLogger
        logger = getLogger(__name__)
        try:
            self.connect()
            # 不显式传 sharding_column，由 pick_shardkey 从 topic.factors 推导
            script = build_table_script(topic, sharding_type=self.sharding_type)
            self.connection.execute(text(script))
        except Exception as e:
            logger.error(e, exc_info=True, stack_info=True)
        finally:
            self.close()

    # noqa: DuplicatedCode
    def update_topic_entity(self, topic: Topic, original_topic: Topic) -> None:
        from logging import getLogger
        logger = getLogger(__name__)
        try:
            self.connect()
            entity_name = as_table_name(topic)
            self.connection.execute(text(f"CALL DROP_INDEXES_ON_TOPIC_CHANGED('{entity_name}')"))
            # 变更列定义
            for column_script in build_columns_script(topic, original_topic):
                try:
                    self.connection.execute(text(column_script))
                except Exception as e:
                    logger.error(e, exc_info=True, stack_info=True)
            # 重建唯一索引（必须包含 shardkey）
            for unique_index_script in build_unique_indexes_script(topic):
                try:
                    self.connection.execute(text(unique_index_script))
                except Exception as e:
                    logger.error(e, exc_info=True, stack_info=True)
            # 重建普通索引
            for index_script in build_indexes_script(topic):
                try:
                    self.connection.execute(text(index_script))
                except Exception as e:
                    logger.error(e, exc_info=True, stack_info=True)
            # 确保 tenant_id_ 和常用时间字段有索引
            for idx_col in ['tenant_id_', 'insert_time_', 'update_time_']:
                try:
                    self.connection.execute(text(f'ALTER TABLE {as_table_name(topic)} ADD INDEX ({idx_col})'))
                except Exception as e:
                    logger.error(e, exc_info=True, stack_info=True)
        except Exception as e:
            logger.error(e, exc_info=True, stack_info=True)
        finally:
            self.close()
```

### 6.4 `table_creator.py`（DDL 生成，正确语法）

```python
from typing import List, Optional

from watchmen_model.admin import Factor, FactorKeyType, Topic
from watchmen_model.common import FactorType
from watchmen_storage import as_table_name

# 当 Topic 中没有 keyType=PARTITION 的 Factor 时，回退到 tenant_id_
DEFAULT_SHARDKEY = 'tenant_id_'

# Watchmen factor 名称 → 数据库列名 的统一规则：name.lower() + '_'
def to_column_name(factor: Factor) -> str:
    return factor.name.lower() + '_'


def pick_shardkey(topic: Topic) -> str:
    """
    从 Topic.factors 中挑选分片键列名。

    选取规则：
    1. 筛选 keyType == FactorKeyType.PARTITION 的 Factor；
    2. 取 keyIndex 最小的那一个（keyIndex=1 优先）；
    3. 若没有匹配项，回退到 tenant_id_。
    """
    candidates = [
        f for f in (topic.factors or [])
        if f.keyType == FactorKeyType.PARTITION
    ]
    if not candidates:
        return DEFAULT_SHARDKEY

    # keyIndex 缺省时按很大值处理，确保显式 keyIndex=1 优先
    candidates.sort(key=lambda f: (f.keyIndex is None, f.keyIndex if f.keyIndex is not None else 0))
    return to_column_name(candidates[0])


def build_table_script(
    topic: Topic,
    sharding_column: Optional[str] = None,
    sharding_type: str = 'HASH',
) -> str:
    """
    生成 TDSQL MySQL 版建表语句，包含分片键配置。

    分片键选取顺序：
    1. 显式传入的 sharding_column 参数（最高优先级）；
    2. Topic.factors 中 keyType=PARTITION 且 keyIndex 最小的 Factor；
    3. 默认回退到 tenant_id_。

    根据官方文档 (https://cloud.tencent.com/document/product/557/8767)：

    - HASH 分表：CREATE TABLE ... ) SHARDKEY=col ENGINE=...
    - RANGE 分表：CREATE TABLE ... ) TDSQL_DISTRIBUTED BY RANGE(col) (...) ENGINE=...
    - LIST 分表：CREATE TABLE ... ) TDSQL_DISTRIBUTED BY LIST(col) (...) ENGINE=...
    - 广播表：CREATE TABLE ... ) SHARDKEY=noshardkey_allset ENGINE=...
    - 单表：不指定 SHARDKEY，语法与 MySQL 完全一致

    主键必须包含分片键，以保证数据分布正确且唯一索引合法。

    示例输出（HASH 分表，shardkey 由 Factor 推导）：
    CREATE TABLE topic_data_orders (
        id_ BIGINT,
        tenant_id_ VARCHAR(50),
        order_no_ VARCHAR(50),
        insert_time_ DATETIME,
        update_time_ DATETIME,
        ...
        PRIMARY KEY (id_, tenant_id_)
    ) SHARDKEY=tenant_id_ ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """
    # 1. 确定分片键列
    if sharding_column is None:
        sharding_column = pick_shardkey(topic)

    columns = []

    # 主键字段（分片键必须在主键中）
    columns.append("id_ BIGINT")
    if sharding_column != 'tenant_id_':
        # 当 shardkey 不是 tenant_id_ 时仍保留 tenant_id_ 列（系统约定）
        columns.append("tenant_id_ VARCHAR(50)")
    else:
        columns.append("tenant_id_ VARCHAR(50)")

    # 系统字段
    columns.append("insert_time_ DATETIME")
    columns.append("update_time_ DATETIME")

    # Factor 字段（去重：避免重复添加 shardkey 列）
    seen_columns = {'id_', 'tenant_id_', 'insert_time_', 'update_time_'}
    for factor in topic.factors:
        column_def = _build_column_def(factor)
        if column_def is None:
            continue
        col_name = to_column_name(factor)
        if col_name in seen_columns:
            continue
        seen_columns.add(col_name)
        columns.append(column_def)

    columns_str = ',\n    '.join(columns)

    # 主键必须包含分片键
    if sharding_column == 'tenant_id_':
        primary_key = "PRIMARY KEY (id_, tenant_id_)"
    else:
        primary_key = f"PRIMARY KEY (id_, {sharding_column})"

    # 根据分片类型生成不同的表尾语法
    sharding_type_upper = sharding_type.upper()

    if sharding_column == 'noshardkey_allset':
        # 广播表
        table_tail = ") SHARDKEY=noshardkey_allset ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        return f"CREATE TABLE {as_table_name(topic)} (\n    {columns_str},\n    {primary_key}\n{table_tail}"
    elif sharding_type_upper == 'HASH':
        # HASH 分表
        table_tail = f") SHARDKEY={sharding_column} ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        return f"CREATE TABLE {as_table_name(topic)} (\n    {columns_str},\n    {primary_key}\n{table_tail}"
    elif sharding_type_upper == 'RANGE':
        # RANGE 分表（分区定义需由配置决定，此处为模板）
        table_tail = (
            f") TDSQL_DISTRIBUTED BY RANGE({sharding_column})\n"
            f"  (s1 VALUES LESS THAN (MAXVALUE))\n"
            f"  ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        )
        return f"CREATE TABLE {as_table_name(topic)} (\n    {columns_str},\n    {primary_key}\n{table_tail}"
    elif sharding_type_upper == 'LIST':
        # LIST 分表（分区定义需由配置决定，此处为模板）
        table_tail = (
            f") TDSQL_DISTRIBUTED BY LIST({sharding_column})\n"
            f"  (s1 VALUES IN (1))\n"
            f"  ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        )
        return f"CREATE TABLE {as_table_name(topic)} (\n    {columns_str},\n    {primary_key}\n{table_tail}"
    else:
        # 单表（无分片，语法与 MySQL 完全一致）
        return f"CREATE TABLE {as_table_name(topic)} (\n    {columns_str},\n    {primary_key}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"


def _build_column_def(factor: Factor) -> Optional[str]:
    """生成列定义（内部函数）"""
    data_type = _get_data_type(factor.type)
    if data_type is None:
        return None

    column_name = to_column_name(factor)

    if factor.type in (FactorType.TEXT, FactorType.LONGTEXT):
        return f"{column_name} {data_type}"
    elif factor.type in (FactorType.VARCHAR, FactorType.CHAR):
        length = factor.length or 255
        return f"{column_name} {data_type}({length})"
    elif factor.type in (FactorType.NUMBER, FactorType.DECIMAL):
        precision = factor.precision or 18
        scale = factor.scale or 4
        return f"{column_name} DECIMAL({precision}, {scale})"
    else:
        return f"{column_name} {data_type}"


def _get_data_type(factor_type: FactorType) -> Optional[str]:
    """映射 FactorType 到 MySQL 数据类型"""
    type_mapping = {
        FactorType.TEXT: 'TEXT',
        FactorType.LONGTEXT: 'LONGTEXT',
        FactorType.VARCHAR: 'VARCHAR',
        FactorType.CHAR: 'CHAR',
        FactorType.NUMBER: 'DECIMAL',
        FactorType.DECIMAL: 'DECIMAL',
        FactorType.INTEGER: 'BIGINT',
        FactorType.BIGINT: 'BIGINT',
        FactorType.DATE: 'DATE',
        FactorType.DATETIME: 'DATETIME',
        FactorType.TIME: 'TIME',
        FactorType.BOOLEAN: 'TINYINT(1)',
        FactorType.JSON: 'JSON',
        FactorType.OBJECT: 'JSON',
    }
    return type_mapping.get(factor_type)


def build_columns_script(topic: Topic, original_topic: Topic) -> List[str]:
    """生成 ALTER TABLE 列变更语句（复用 MySQL 实现，TDSQL 语法兼容）"""
    from watchmen_storage_mysql.table_creator import build_columns_script as mysql_build
    return mysql_build(topic, original_topic)


def build_indexes_script(topic: Topic) -> List[str]:
    """生成普通索引创建语句（复用 MySQL 实现）"""
    from watchmen_storage_mysql.table_creator import build_indexes_script as mysql_build
    return mysql_build(topic)


def build_unique_indexes_script(topic: Topic) -> List[str]:
    """生成唯一索引创建语句（复用 MySQL 实现，需确保包含 shardkey）"""
    from watchmen_storage_mysql.table_creator import build_unique_indexes_script as mysql_build
    return mysql_build(topic)
```

### 6.5 `storage_tdsql_configuration.py`

```python
from watchmen_model.system import DataSource
from .data_source_tdsql import TDSQLDataSourceHelper, TDSQLDataSourceParams
from .storage_tdsql import StorageTDSQL, TopicDataStorageTDSQL


class StorageTDSQLConfiguration:
    """TDSQL MySQL 版存储配置持有者"""

    def __init__(self, data_source: DataSource, params: TDSQLDataSourceParams):
        self.helper = TDSQLDataSourceHelper(data_source, params)

    def create_storage(self) -> StorageTDSQL:
        return self.helper.acquire_storage()

    def create_topic_data_storage(self) -> TopicDataStorageTDSQL:
        return self.helper.acquire_topic_data_storage()
```

### 6.6 `__init__.py`

```python
from .data_source_tdsql import TDSQLDataSourceHelper, TDSQLDataSourceParams
from .storage_tdsql import StorageTDSQL, TopicDataStorageTDSQL
from .storage_tdsql_configuration import StorageTDSQLConfiguration

__all__ = [
    'TDSQLDataSourceHelper', 'TDSQLDataSourceParams',
    'StorageTDSQL', 'TopicDataStorageTDSQL',
    'StorageTDSQLConfiguration',
]
```

---

## 7. 部署配置

### 7.1 数据源配置

| 字段             | 示例值                       | 说明                            |
| ---------------- | ---------------------------- | ------------------------------- |
| Data Source Type | TDSQL MySQL                  | 下拉选择                        |
| Host             | `dcdb-xxx.gz.tencentcdb.com` | TDSQL 代理地址                  |
| Port             | `10086`                      | 代理端口                        |
| Username         | `watchmen`                   | 数据库用户名                    |
| Password         | `***`                        | 密码                            |
| Schema           | `watchmen_metricflow`        | 数据库名                        |
| Sharding Column  | `tenant_id_`                 | 分片键（可选，默认 tenant*id*） |
| Sharding Type    | `HASH`                       | 分片类型（可选，默认 HASH）     |

### 7.2 连接 URL

```
mysql+pymysql://watchmen:password@dcdb-xxx.gz.tencentcdb.com:10086/watchmen_metricflow?charset=utf8mb4
```

> TDSQL 通过 Proxy 层对外提供 MySQL 协议接口，连接方式与 MySQL 完全相同。

---

## 8. 已知限制与风险

| 限制                              | 说明                                     | 规避措施                      |
| --------------------------------- | ---------------------------------------- | ----------------------------- |
| **内核 5.7 不支持 RANGE/LIST**    | `TDSQL_DISTRIBUTED BY` 语法仅 8.0+ 支持  | 确认 TDSQL 实例内核版本       |
| **shardkey 值不能有中文**         | Proxy 不转换字符集，中文值会导致路由错误 | 使用 ASCII 类型的 shardkey    |
| **不能 UPDATE shardkey**          | 修改 shardkey 值需要删除重建             | 应用层禁止更新 shardkey 字段  |
| **查询不带 shardkey 会全表扫描**  | 广播到所有分片，消耗大量资源             | 应用层确保查询条件带 shardkey |
| **LIST/RANGE 分区别名不可自定义** | `s1`、`s2` 按顺序命名                    | 按规范使用                    |
| **单分片容量限制**                | ≤ 2TB，≤ 2千万行                         | 合理规划 shardkey 和分片数量  |

---

## 9. 目录结构

```
packages/watchmen-storage-tdsql/
├── pyproject.toml
├── docs/
│   └── TDSQL_DESIGN.md          ← 本文档
└── src/
    └── watchmen_storage_tdsql/
        ├── __init__.py
        ├── data_source_tdsql.py
        ├── storage_tdsql.py
        ├── storage_tdsql_configuration.py
        └── table_creator.py
```

---

## 10. 参考资料

- [TDSQL MySQL 版产品文档](https://cloud.tencent.com/document/product/557)
- [建表语法（DDL）](https://cloud.tencent.com/document/product/557/8767)
- [TDSQL 开发指南](https://cloud.tencent.com/document/product/557/10238)
- [Watchmen DSQL 设计文档](https://github.com/IndexMisaka/watchmen/blob/master/packages/watchmen-storage-dsql/docs/DSQL_DESIGN.md)
