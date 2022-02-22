from abc import abstractmethod

from watchmen_model.system import DataSource
from .storage_spi import StorageSPI, TopicDataStorageSPI


class DataSourceHelper:
	def __init__(self, data_source: DataSource):
		self.dataSource = data_source

	@abstractmethod
	def acquire_storage(self) -> StorageSPI:
		pass

	@abstractmethod
	def acquire_topic_data_storage(self) -> TopicDataStorageSPI:
		pass
