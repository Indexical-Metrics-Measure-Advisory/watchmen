
from .storage_spi import TransactionalStorageSPI
from .storage_types import EntityDeleter, EntityCriteriaExpression, ColumnNameLiteral
from .storage_based_worker_id_generator import SNOWFLAKE_WORKER_ID_TABLE, COMPETITIVE_WORKER_SHAPER


class StorageBasedWorkerIdService:

	def __init__(self, storage: TransactionalStorageSPI):
		self.storage = storage

	def release_worker(self, data_center_id: int, worker_id: int) -> None:
		self.storage.begin()
		try:
			self.storage.delete(
				EntityDeleter(
					name=SNOWFLAKE_WORKER_ID_TABLE,
					shaper=COMPETITIVE_WORKER_SHAPER,
					criteria=[
						EntityCriteriaExpression(
							left=ColumnNameLiteral(columnName='data_center_id'), right=data_center_id),
						EntityCriteriaExpression(
							left=ColumnNameLiteral(columnName='worker_id'), right=worker_id)
					]
				)
			)
			self.storage.commit_and_close()
		except Exception as e:
			self.storage.rollback_and_close()
			raise e
		finally:
			self.storage.close()


def get_storage_based_worker_id_service(storage: TransactionalStorageSPI) -> StorageBasedWorkerIdService:
	return StorageBasedWorkerIdService(storage)
