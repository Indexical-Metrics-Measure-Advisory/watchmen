from typing import List, Tuple

from watchmen_auth import PrincipalService
from watchmen_collector_batch.model.batch_config_log import BatchConfigLog
from watchmen_meta.common import TupleService, TupleShaper
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable, OptimisticLock
from watchmen_storage import EntityName, EntityRow, EntityShaper, TransactionalStorageSPI, SnowflakeGenerator, \
	EntityCriteriaExpression, ColumnNameLiteral, EntityDeleter
from watchmen_utilities import ArrayHelper


class BatchConfigLogShaper(EntityShaper):
	def serialize(self, entity: BatchConfigLog) -> EntityRow:
		return TupleShaper.serialize_tenant_based(entity,
		                                          {
			                                          'log_id': entity.logId,
			                                          'tran_id': entity.tranId,
			                                          'pipeline_id': entity.pipelineId,
			                                          'action_id': entity.actionId,
			                                          'status': entity.status,
			                                          'action': entity.action,
			                                          'error': entity.error
		                                          })

	def deserialize(self, row: EntityRow) -> BatchConfigLog:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row,
		                                            BatchConfigLog(
			                                            logId=row.get('log_id'),
			                                            tranId=row.get('tran_id'),
			                                            pipelineId=row.get('pipeline_id'),
			                                            actionId=row.get('action_id'),
			                                            status=row.get('status'),
			                                            action=row.get('action'),
			                                            error=row.get('error')
		                                            ))


COLLECTOR_BATCH_CONFIG_LOG_TABLE = 'collector_batch_config_log'
COLLECTOR_BATCH_CONFIG_LOG_ENTITY_SHAPER = BatchConfigLogShaper()


class BatchConfigLogService(TupleService):

	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> EntityName:
		return COLLECTOR_BATCH_CONFIG_LOG_TABLE

	def get_entity_shaper(self) -> EntityShaper:
		return COLLECTOR_BATCH_CONFIG_LOG_ENTITY_SHAPER

	# noinspection SpellCheckingInspection
	def get_storable_id_column_name(self) -> EntityName:
		return 'log_id'

	# noinspection SpellCheckingInspection
	def get_storable_id(self, storable: BatchConfigLog) -> StorableId:
		# noinspection PyTypeChecker
		return storable.logId

	# noinspection SpellCheckingInspection
	def set_storable_id(self, storable: BatchConfigLog, storable_id: int) -> Storable:
		storable.logId = storable_id
		return storable

	def create_log(self, record: BatchConfigLog) -> None:
		self.begin_transaction()
		try:
			self.create(record)
			self.commit_transaction()
		except Exception as e:
			self.rollback_transaction()
			raise e
		finally:
			self.close_transaction()
			
	def create_logs(self, records: List[BatchConfigLog]) -> None:
		
		def prepare_insert(a_tuple: Tuple) -> Tuple:
			self.try_to_prepare_auditable_on_create(a_tuple)
			if isinstance(a_tuple, OptimisticLock):
				a_tuple.version = 1
			return a_tuple
		
		batch_size = 1000
		for i in range(0, len(records), batch_size):
			batch = records[i:i + batch_size]
			tuples = ArrayHelper(batch).map(lambda record: prepare_insert(record)).to_list()
			self.begin_transaction()
			try:
				self.storage.insert_all(tuples, self.get_entity_helper())
				self.commit_transaction()
			except Exception as e:
				self.rollback_transaction()
				raise e
			finally:
				self.close_transaction()
	
	def delete_by_tenant_id(self, tenant_id: int) -> None:
		self.storage.begin()
		try:
			self.storage.delete(
				EntityDeleter(
					name=COLLECTOR_BATCH_CONFIG_LOG_TABLE,
					shaper=COLLECTOR_BATCH_CONFIG_LOG_ENTITY_SHAPER,
					criteria=[
						EntityCriteriaExpression(
							left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)
					]
				)
			)
			self.storage.commit_and_close()
		except Exception as e:
			self.storage.rollback_and_close()
			raise e
		finally:
			self.storage.close()

def get_batch_config_log_service(storage: TransactionalStorageSPI,
                                   snowflake_generator: SnowflakeGenerator,
                                   principal_service: PrincipalService
                                   ) -> BatchConfigLogService:
	return BatchConfigLogService(storage, snowflake_generator, principal_service)
