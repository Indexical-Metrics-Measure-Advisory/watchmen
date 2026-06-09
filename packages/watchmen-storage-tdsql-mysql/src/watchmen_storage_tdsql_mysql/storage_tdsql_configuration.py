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