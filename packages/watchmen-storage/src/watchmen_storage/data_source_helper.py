from abc import abstractmethod

from watchmen_model.system import DataSource
from watchmen_storage.storage_spi import StorageSPI


class DataSourceHelper:
	def __init__(self, data_source: DataSource):
		self.data_source = data_source

	@abstractmethod
	def acquire_storage(self) -> StorageSPI:
		pass
