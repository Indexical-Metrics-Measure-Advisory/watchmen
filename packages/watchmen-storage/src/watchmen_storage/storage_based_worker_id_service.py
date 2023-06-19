from watchmen_meta.common import StorageService
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, \
	TransactionalStorageSPI, COMPETITIVE_WORKER_SHAPER, SNOWFLAKE_WORKER_ID_TABLE, \
	EntityDeleter


class StorageBasedWorkerIdService(StorageService):

	def __init__(self, storage: TransactionalStorageSPI):
		super().__init__(storage)

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


def get_storage_based_worker_id_service(storage: TransactionalStorageSPI) -> StorageBasedWorkerIdService:
	return StorageBasedWorkerIdService(storage)
