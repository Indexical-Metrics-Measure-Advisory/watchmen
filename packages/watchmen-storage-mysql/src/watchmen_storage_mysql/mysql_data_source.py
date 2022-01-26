from watchmen_storage import DataSourceHelper
from watchmen_storage.storage_spi import StorageSPI


class MySQLDataSourceHelper(DataSourceHelper):
	def acquire_storage(self) -> StorageSPI:
		pass
