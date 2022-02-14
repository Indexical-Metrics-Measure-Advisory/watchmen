from typing import Callable

from watchmen_model.system import DataSource, DataSourceType
from watchmen_reactor.common import ask_storage_echo_enabled, ReactorException
from watchmen_storage import TopicDataStorageSPI
from watchmen_storage_mysql import MySQLDataSourceParams


def build_mysql_storage(data_source: DataSource) -> Callable[[], TopicDataStorageSPI]:
	from watchmen_storage_mysql import StorageMySQLConfiguration
	configuration = StorageMySQLConfiguration(data_source, MySQLDataSourceParams(echo=ask_storage_echo_enabled()))
	return lambda: configuration.create_topic_data_storage()


def build_topic_data_storage(data_source: DataSource) -> Callable[[], TopicDataStorageSPI]:
	if data_source.dataSourceType == DataSourceType.MYSQL:
		return build_mysql_storage(data_source)
	# TODO build oracle storage
	# TODO build mongodb storage

	raise ReactorException(
		f'Reactor storage[id={data_source.name}, type={data_source.dataSourceType}] is not supported yet.')
