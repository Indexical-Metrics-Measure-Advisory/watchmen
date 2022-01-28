from unittest import TestCase

from time import sleep

from watchmen_storage import competitive_worker_id, CompetitiveWorkerRestarter, CompetitiveWorkerShutdownSignal, \
	StorageBasedWorkerIdGenerator
from watchmen_storage_mysql import StorageMySQLConfiguration


class FirstTest(TestCase):

	def setUp(self) -> None:
		# self.dataSource = DataSource(
		# 	dataSourceType=DataSourceType.MYSQL,
		# 	name='watchmen',
		# 	host='localhost',
		# 	port='3306',
		# 	username='watchmen',
		# 	password='watchmen'
		# )
		self.storage = StorageMySQLConfiguration.config() \
			.host('localhost', 3306).account('watchmen', 'watchmen').schema('watchmen') \
			.build()

	def test_one(self):
		def shutdown_listener(signal: CompetitiveWorkerShutdownSignal, restarter: CompetitiveWorkerRestarter) -> None:
			print(signal)

		worker_id_generator = competitive_worker_id(StorageBasedWorkerIdGenerator(
			storage=self.storage,
			shutdown_listener=shutdown_listener
		))
		# SnowflakeGenerator(generate_worker_id=worker_id_generator)
		sleep(30)
