from unittest import TestCase

from time import sleep

from watchmen_storage import competitive_worker_id, CompetitiveWorkerRestarter, CompetitiveWorkerShutdownSignal, \
	StorageBasedWorkerIdGenerator
from watchmen_storage_mysql import StorageMySQLConfiguration


class FirstTest(TestCase):

	def setUp(self) -> None:
		self.storage = StorageMySQLConfiguration.config() \
			.host('localhost', 3306).account('watchmen', 'watchmen').schema('watchmen') \
			.echo(True) \
			.build()

	def test_one(self):
		def shutdown_listener(
				signal: CompetitiveWorkerShutdownSignal, data_center_id: int, worker_id: int,
				restart: CompetitiveWorkerRestarter
		) -> None:
			print(signal)

		worker_id_generator = competitive_worker_id(StorageBasedWorkerIdGenerator(
			storage=self.storage,
			shutdown_listener=shutdown_listener
		))
		# SnowflakeGenerator(generate_worker_id=worker_id_generator)
		sleep(30)
