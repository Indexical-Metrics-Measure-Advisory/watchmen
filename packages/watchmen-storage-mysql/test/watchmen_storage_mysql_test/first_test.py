from unittest import TestCase

from watchmen_model.system import DataSource, DataSourceType
from watchmen_storage import competitive_worker_id, CompetitiveWorkerRestarter, CompetitiveWorkerShutdownSignal, \
	StorageBasedWorkerIdGenerator
from watchmen_storage_mysql import MySQLDataSourceHelper


class FirstTest(TestCase):

	def setUp(self) -> None:
		self.dataSource = DataSource(
			dataSourceType=DataSourceType.MYSQL,
			name='watchmen',
			host='localhost',
			port='3306',
			username='watchmen',
			password='watchmen'
		)

	def test_one(self):
		helper = MySQLDataSourceHelper(self.dataSource)

		def shutdown_listener(signal: CompetitiveWorkerShutdownSignal, restarter: CompetitiveWorkerRestarter) -> None:
			print(signal)

		worker_id_generator = competitive_worker_id(StorageBasedWorkerIdGenerator(
			storage=helper.acquire_storage(),
			shutdown_listener=shutdown_listener
		))
	# SnowflakeGenerator(generate_worker_id=worker_id_generator)
