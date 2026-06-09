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