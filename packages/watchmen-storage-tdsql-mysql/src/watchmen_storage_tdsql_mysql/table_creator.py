from typing import List, Optional

from watchmen_model.admin import Factor, FactorKeyType, Topic
from watchmen_model.common import FactorType
from watchmen_storage import as_table_name

# 当 Topic 中没有 keyType=PARTITION 的 Factor 时，回退到 tenant_id_
DEFAULT_SHARDKEY = 'tenant_id_'


def to_column_name(factor: Factor) -> str:
    """Watchmen factor 名称 → 数据库列名 的统一规则：name.lower() + '_'"""
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