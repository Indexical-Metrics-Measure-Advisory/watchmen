import logging
from typing import Callable

from watchmen_data_kernel.common import ask_storage_echo_enabled
from watchmen_model.system import DataSource, DataSourceType
from watchmen_storage import TopicDataStorageSPI

logger = logging.getLogger(__name__)

def build_topic_data_storage_batch_writer(data_source: DataSource) -> Callable[[], TopicDataStorageSPI]:
    if data_source.dataSourceType == DataSourceType.ORACLE:
        return build_oracle_storage_batch_writer(data_source)
    raise RuntimeError(f"unknown data source type: {data_source.dataSourceType}")


def build_oracle_storage_batch_writer(data_source: DataSource) -> Callable[[], TopicDataStorageSPI]:
    from watchmen_storage_oracle import StorageOracleConfiguration, OracleDataSourceParams
    configuration = StorageOracleConfiguration(data_source, OracleDataSourceParams(echo=ask_storage_echo_enabled()))
    return lambda: configuration.create_topic_data_storage_batch_writer()

