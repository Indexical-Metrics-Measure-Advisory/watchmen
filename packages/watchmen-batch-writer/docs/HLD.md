# watchmen-batch-writer 高阶设计（HLD）

## 1. 背景与目标

### 1.1 问题

当前从上游数据源（logbase）将 CDC 数据写入 ODS 层需要经过完整链路：

```
Source DB → Collector → change_data_record → pipeline → ODS Topic
```

当只需要将 CDC 数据**批量同步到 ODS 层存储**，**不需要触发数据清洗/转换管道**时，整条链路过重，且无法满足上亿级数据的同步吞吐需求。

### 1.2 目标

新建 `watchmen-batch-writer` 独立服务，实现：

1. **监听 Kafka** — 消费 logbase 的 Canal 格式 CDC 消息
2. **批量写入 ODS** — 将数据批量写入 ODS 层 Topic 存储，支持 INSERT / UPDATE / DELETE
3. **不触发管道** — 写入路径完全旁路 pipeline 触发链
4. **复用现有配置** — 复用 ingest table 定义和 pipeline 字段映射，无需重复配置
5. **高吞吐** — 通过数据库原生批量写入协议（PG COPY / MySQL LOAD DATA / 通用多行 INSERT）实现 10x ~ 30x 性能提升，支持 PostgreSQL、MySQL 等关系数据库

---

## 2. 整体架构

```
                         ┌───────────────────────────────┐
                         │        Kafka Topic             │
                         │   (logbase Canal CDC 消息)      │
                         └──────────────┬────────────────┘
                                        │ poll batch
                                        ▼
┌───────────────────────────────────────────────────────────────────────┐
│                      watchmen-batch-writer                             │
│                                                                        │
│  ┌──────────────┐    ┌─────────────────┐    ┌───────────────────┐     │
│  │ Kafka        │    │ Batch           │    │ Config Loader     │     │
│  │ Consumer     │───▶│ Accumulator     │    │                   │     │
│  │ (aiokafka)   │    │                 │    │ table → model     │     │
│  │              │    │ · 按 table 分组 │    │ model → raw topic │     │
│  │ auto_commit  │    │ · 数量/时间     │    │ raw topic →       │     │
│  │ = false      │    │   双阈值 flush  │    │   pipeline        │     │
│  └──────────────┘    │ · 按 binlog     │    │ pipeline →        │     │
│                       │   position 排序│    │   field mapping   │     │
│                       └───────┬────────┘    └─────────┬─────────┘     │
│                               │                       │               │
│                               ▼                       ▼               │
│                       ┌───────────────────────────────────────┐      │
│                       │         Batch Writer                   │      │
│                       │                                       │      │
│                       │  1. 字段映射 (CDC → ODS format)        │      │
│                       │  2. 类型转换 (prepare_data)            │      │
│                       │  3. 按操作类型路由:                    │      │
│                       │     INSERT / UPDATE / DELETE           │      │
│                       │  4. 路由到 DB Adapter                   │      │
│                       └──────────────────┬────────────────────┘      │
│                                          │                            │
│                        ┌─────────────────▼──────────────────────┐    │
│                        │          DB Adapter Layer               │    │
│                        │                                        │    │
│                        │  ┌──────────┐  ┌──────────┐  ┌───────┐ │    │
│                        │  │PostgreSQL│  │  MySQL   │  │ 通用  │ │    │
│                        │  │ COPY +   │  │ LOAD DATA│  │ 多行  │ │    │
│                        │  │ 临时表   │  │ / 多行   │  │INSERT │ │    │
│                        │  │ UPSERT   │  │  UPSERT  │  │       │ │    │
│                        │  └──────────┘  └──────────┘  └───────┘ │    │
│                        └─────────────────┬──────────────────────┘    │
│                                          │                            │
│  ┌──────────────┐    ┌──────────────────────────────────────────┐    │
│  │ Metrics      │    │ Health HTTP Server (:9090)                │    │
│  │ (Prometheus) │    │ /health  → liveness probe                  │    │
│  │              │    │ /metrics → Prometheus scrape endpoint      │    │
│  └──────────────┘    └──────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
                                        │
                        ┌───────────────┼───────────────┐
                        ▼               ▼               ▼
                 ┌──────────┐    ┌──────────┐    ┌──────────┐
                 │PostgreSQL│    │  MySQL   │    │  其他    │
                 │  Storage │    │  Storage │    │  Storage │
                 └──────────┘    └──────────┘    └──────────┘
```

---

## 3. 核心设计决策

| #   | 决策点           | 选择                                 | 理由                                                                                                              |
| --- | ---------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| 1   | **语言**         | Python (aiokafka)                    | 复用现有基础设施（认证、配置、存储抽象），与现有服务生态一致                                                      |
| 2   | **多数据库支持** | DB Adapter 策略模式                  | 统一接口，按数据库类型自动选择最优写入路径；支持 PostgreSQL、MySQL 等关系数据库                                   |
| 3   | **写入策略**     | 数据库原生批量协议                   | PG: COPY + 临时表 UPSERT (30x)；MySQL: 多行 INSERT ... ON DUPLICATE KEY UPDATE (10x)；通用: 多行 INSERT           |
| 4   | **管道触发**     | 完全旁路                             | 绕过 `TopicDataService`，不创建 `TopicTrigger`，不触发 pipeline                                                   |
| 5   | **配置复用**     | 自动查找 ingest 配置 + pipeline 映射 | 通过 `table` 字段反查 `CollectorTableConfig` → `CollectorModelConfig` → `rawTopicCode` → Pipeline → MappingFactor |
| 6   | **消息格式**     | Canal CDC 格式                       | 与 logbase 输出一致，`table` 字段为查找入口                                                                       |
| 7   | **租户识别**     | PAT 认证                             | 一个实例服务一个租户，PAT 注入后 `principal_service.tenantId` 自动可用                                            |
| 8   | **DELETE 处理**  | 软删除 (flag)                        | 标记 `is_deleted=1`，保留数据历史，不物理删除                                                                     |
| 9   | **消息顺序**     | 单 partition + binlog 排序           | 上游按 `table` 分区，消费者按 `msg.id` 排序后批量写入                                                             |
| 10  | **幂等性**       | UPSERT 语义                          | 各数据库原生 UPSERT 对重复写入天然幂等                                                                            |
| 11  | **Offset 提交**  | 写入成功后手动提交                   | `enable_auto_commit=false`，保证 at-least-once 语义                                                               |

---

## 4. 数据流

```
┌─────────────────────────────────────────────────────────────────────┐
│ Kafka 消息 (Canal CDC)                                               │
│ { database, table, type, data[], old[], mysqlType, id, ts, ... }    │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │ 1. 解析 CanalCDCMessage │
                    │    跳过 DDL (isDdl=true) │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │ 2. 按 table 分组缓冲     │
                    │    累积到 batchSize 或   │
                    │    flushInterval 触发    │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │ 3. 按 binlog position   │
                    │    排序 (msg.id)         │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────────────────────────────┐
                    │ 4. 配置查找链                                     │
                    │    table → CollectorTableConfig                  │
                    │         → modelName → CollectorModelConfig       │
                    │         → rawTopicCode → Raw Topic               │
                    │         → Pipeline → MappingFactor[]             │
                    │         → {source_field: target_field} 映射表    │
                    └────────────┬────────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │ 5. 字段映射 + 类型转换   │
                    │    CDC row → ODS format  │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────────────────────────────┐
                    │ 6. 按操作类型路由 → DB Adapter 写入          │
                    │                                                  │
                    │  INSERT: 批量 INSERT                            │
                    │  UPDATE: 批量 UPSERT（DB 特定语法）             │
                    │  DELETE: old[] 主键 + is_deleted=1 → UPSERT     │
                    │                                                  │
                    │  PostgreSQL: COPY → 临时表 → ON CONFLICT        │
                    │  MySQL:     多行 INSERT → ON DUPLICATE KEY      │
                    │  通用:      多行 INSERT → 逐行 UPSERT 降级      │
                    └────────────┬────────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │ 7. 写入成功 → 提交 offset│
                    └─────────────────────────┘
```

---

## 5. 多数据库适配策略

### 5.1 设计原则

```
                    ┌─────────────────────────────┐
                    │       BatchWriter            │
                    │  (操作类型路由：I/U/D)        │
                    └──────────────┬──────────────┘
                                   │ get_adapter(storage)
                    ┌──────────────▼──────────────┐
                    │       AdapterFactory         │
                    │  storage.get_data_source_type│
                    └──────────────┬──────────────┘
                                   │
           ┌───────────────────────┼───────────────────────┐
           ▼                       ▼                       ▼
   ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
   │PostgresAdapter│      │ MySQLAdapter │       │GenericAdapter│
   │              │       │              │       │              │
   │ COPY + 临时表│       │ 多行 INSERT  │       │ 多行 INSERT  │
   │ ON CONFLICT  │       │ ON DUPLICATE │       │ 逐行 UPSERT  │
   │ DO UPDATE    │       │ KEY UPDATE   │       │ 降级         │
   └──────────────┘       └──────────────┘       └──────────────┘
```

采用**策略模式**，为每种关系数据库提供专属 Adapter，BatchWriter 通过 `AdapterFactory` 根据 `DataSourceType` 自动获取对应适配器。

### 5.2 各数据库写入策略

| 数据库         | INSERT 策略             | UPSERT 策略                             | UPSERT 语法                                                                    | 相对吞吐 |
| -------------- | ----------------------- | --------------------------------------- | ------------------------------------------------------------------------------ | -------- |
| **PostgreSQL** | COPY 直写               | COPY → 临时表 → ON CONFLICT DO UPDATE   | `INSERT INTO t SELECT * FROM staging ON CONFLICT (pk) DO UPDATE SET ...`       | **30x**  |
| **MySQL**      | 多行 INSERT (1000条/批) | 多行 INSERT ... ON DUPLICATE KEY UPDATE | `INSERT INTO t VALUES (...), (...) ON DUPLICATE KEY UPDATE c1=VALUES(c1), ...` | **10x**  |
| **通用降级**   | 多行 INSERT (500条/批)  | 逐行 UPSERT                             | 数据库特定语法或逐行 INSERT + UPDATE                                           | 3x ~ 5x  |

### 5.3 PostgreSQL Adapter（最优路径）

```
INSERT:  Python 构建 CSV → COPY 直写目标表             → ~27ms / 2000条
UPSERT:  CREATE TEMP TABLE → COPY staging → MERGE     → ~34ms / 2000条
DELETE:  同 UPSERT（old[] 主键 + is_deleted=1）
```

### 5.4 MySQL Adapter（高性能路径）

```
INSERT:  多行 INSERT VALUES (r1), (r2), ..., (r1000)          → ~180ms / 2000条
UPSERT:  多行 INSERT VALUES (...) ON DUPLICATE KEY UPDATE      → ~200ms / 2000条
         分批执行（每批 1000 条），多批在同一事务内提交
DELETE:  同 UPSERT（old[] 主键 + is_deleted=1）
```

**MySQL 为什么不用 LOAD DATA INFILE？**

- 需要 `FILE` 权限和服务器端文件访问
- 容器化部署中文件系统不共享
- 多行 INSERT 在 1000 条/批时已有 10x 性能提升，足够覆盖大部分场景

### 5.5 通用 Adapter（降级路径）

当数据库类型无法识别或不支持上述优化策略时，自动降级为：

```
INSERT:  多行 INSERT VALUES (...)                     → ~300ms / 2000条
UPSERT:  逐行 INSERT ... ON CONFLICT / MERGE          → ~1000ms / 2000条
DELETE:  逐行 UPDATE SET is_deleted=1 WHERE pk=?
```

### 5.6 Adapter 接口定义

```python
class BaseAdapter:
    """关系数据库批量写入适配器基类"""

    def batch_insert(self, storage, table, columns, rows) -> int:
        """批量 INSERT，返回写入行数"""

    def batch_upsert(self, storage, table, columns, pk_columns, rows) -> int:
        """批量 UPSERT，返回写入行数"""

    def batch_delete(self, storage, table, columns, pk_columns, rows,
                     soft_delete_field, soft_delete_value) -> int:
        """批量软删除，返回写入行数"""
```

### 5.7 性能对比总览

| 策略            | PostgreSQL   | MySQL   | 通用 RDBMS |
| --------------- | ------------ | ------- | ---------- |
| INSERT 2,000 条 | ~27ms (COPY) | ~180ms  | ~300ms     |
| UPSERT 2,000 条 | ~34ms        | ~200ms  | ~1000ms    |
| 相对逐行 INSERT | **37x**      | **5x**  | **3x**     |
| 相对逐行 UPSERT | **30x**      | **10x** | **1x**     |

---

## 6. 包结构

```
packages/watchmen-batch-writer/
├── pyproject.toml
├── Dockerfile
└── src/watchmen_batch_writer/
    ├── __main__.py              # 启动入口 + 优雅关闭
    ├── settings.py              # 配置（PAT、软删除、监控端口）
    ├── model.py                 # CanalCDCMessage 模型
    ├── consumer.py              # Kafka 消费者 (aiokafka)
    ├── accumulator.py           # 批次累积（分组 + 双阈值 + 排序 + offset 追踪）
    ├── config_loader.py         # 配置加载（table → model → topic → pipeline）
    ├── writer.py                # 批量写入（字段映射 + 操作路由 + 软删除）
    ├── adapters/
    │   ├── __init__.py          # AdapterFactory（按 DataSourceType 分发）
    │   ├── base.py              # BaseAdapter 抽象基类
    │   ├── postgres.py          # PostgreSQL: COPY + 临时表 UPSERT
    │   ├── mysql.py             # MySQL: 多行 INSERT ON DUPLICATE KEY UPDATE
    │   └── generic.py           # 通用: 多行 INSERT 降级
    ├── metrics.py               # Prometheus 指标
    ├── health.py                # 健康检查端点 (/health + /metrics)
    └── retry.py                 # 重试策略
```

---

## 7. 与现有系统关系

```
现有完整 CDC 链路（重型，含 pipeline）：
  Source DB → Collector → change_data_record → pipeline → ODS Topic

新链路（轻量，旁路 pipeline）：
  logbase CDC → Kafka → batch-writer → ODS Topic (COPY)
                         │
                         ├── 复用 ingest table 配置
                         └── 复用 pipeline 字段映射
```

两者**可共存**，batch-writer 适用于仅需批量同步到 ODS 层、不触发管道的场景。

---

## 8. 监控与可观测性

### 8.1 Prometheus 指标

| 指标                                            | 类型      | 标签                        | 说明           |
| ----------------------------------------------- | --------- | --------------------------- | -------------- |
| `watchmen_batch_writer_rows_total`              | Counter   | table, tenant_id, operation | 写入行数       |
| `watchmen_batch_writer_writes_total`            | Counter   | table, status               | 批次写入次数   |
| `watchmen_batch_writer_errors_total`            | Counter   | table, error_type           | 写入错误数     |
| `watchmen_batch_writer_write_latency_seconds`   | Histogram | table                       | 写入延迟       |
| `watchmen_batch_writer_buffer_size`             | Gauge     | table                       | 当前缓冲区大小 |
| `watchmen_batch_writer_consumer_lag`            | Gauge     | topic, partition            | Kafka 消费延迟 |
| `watchmen_batch_writer_messages_consumed_total` | Counter   | topic                       | 消费消息数     |

### 8.2 健康检查

| 端点           | 用途                                              |
| -------------- | ------------------------------------------------- |
| `GET /health`  | K8s liveness probe（检查 consumer 连接、DB 连接） |
| `GET /metrics` | Prometheus scrape endpoint                        |

### 8.3 日志

复用现有 MDC（Mapped Diagnostic Context）结构化日志，支持按 `tenantId`、`table` 追踪。

---

## 9. 优雅关闭

```
SIGTERM / SIGINT
    │
    ▼
1. 停止定时 flush 任务
    │
    ▼
2. flush_all() — 排空所有缓冲区
    │
    ▼
3. consumer.stop() — 停止消费，提交 offset
    │
    ▼
4. 退出进程
```

---

## 10. 部署

### 10.1 配置（环境变量）

| 变量                      | 默认值                  | 说明                              |
| ------------------------- | ----------------------- | --------------------------------- |
| `KAFKA_BOOTSTRAP_SERVERS` | —                       | Kafka 集群地址                    |
| `KAFKA_TOPICS`            | —                       | 消费的 topic 列表（逗号分隔）     |
| `KAFKA_CONSUMER_GROUP`    | `watchmen-batch-writer` | Consumer group                    |
| `WATCHMEN_PAT`            | —                       | Personal Access Token（关联租户） |
| `BATCH_SIZE`              | `500`                   | 批次大小阈值（条）                |
| `FLUSH_INTERVAL_SEC`      | `5`                     | 定时刷新间隔（秒）                |
| `SOFT_DELETE_FIELD`       | `is_deleted`            | 软删除标记字段名                  |
| `SOFT_DELETE_VALUE`       | `1`                     | 软删除标记值                      |
| `HEALTH_PORT`             | `9090`                  | 健康检查端口                      |
| `MAX_RETRIES`             | `3`                     | 写入失败重试次数                  |
| `RETRY_DELAY_SEC`         | `1`                     | 重试间隔（秒）                    |

### 10.2 水平扩展

通过 Kafka consumer group 自动分区分配，多实例负载均衡。

### 10.3 多租户

每个 batch-writer 实例配置一个 PAT，服务一个租户。多租户 = 多实例部署。

---

## 11. 局限与风险

| 风险                          | 缓解措施                                                                               |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| COPY 是 PostgreSQL 特有协议   | MySQL 等使用多行 INSERT ON DUPLICATE KEY UPDATE（10x 性能）；通用后端降级为逐行 UPSERT |
| 非 PG 后端性能较低            | 通过 DB Adapter 自动选择各数据库最优策略；性能瓶颈场景优先使用 PostgreSQL              |
| 单 partition 消费可能成为瓶颈 | 按 `table` 分区，不同表可并行消费                                                      |
| 配置变更需重启实例            | K8s 滚动更新，零中断                                                                   |
| 消息丢失风险                  | at-least-once 语义 + 幂等写入                                                          |
| 大量 DELETE 可能产生数据膨胀  | 后续可增加定期物理清理任务                                                             |
| 新增数据库需要开发新 Adapter  | Adapter 接口简洁（3个方法），新增一个数据库约 150 行代码                               |

---

## 12. 与详细设计的关系

本文档为高阶设计，面向沟通和 review。完整实现细节（数据库操作、代码示例、错误处理矩阵等）见 [DESIGN.md](./DESIGN.md)。
