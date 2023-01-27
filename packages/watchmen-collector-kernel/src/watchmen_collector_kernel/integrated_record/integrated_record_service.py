from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import CollectorIntegratedRecord
from watchmen_collector_kernel.service import get_collector_integrated_record_service
from watchmen_model.common import CollectorIntegratedRecordId
from watchmen_storage import TransactionalStorageSPI, SnowflakeGenerator


class IntegratedRecordService:

	def __init__(self, storage: TransactionalStorageSPI,
	             snowflake_generator: SnowflakeGenerator,
	             principal_service: PrincipalService):
		self.storage = storage
		self.snowflakeGenerator = snowflake_generator
		self.collector_integrated_record_service = get_collector_integrated_record_service(self.storage,
		                                                                                   self.snowflakeGenerator,
		                                                                                   principal_service)

	def create(self, record: CollectorIntegratedRecord) -> CollectorIntegratedRecord:
		self.collector_integrated_record_service.begin_transaction()
		try:
			record = self.collector_integrated_record_service.create(record)
			self.collector_integrated_record_service.commit_transaction()
			# noinspection PyTypeChecker
			return record
		except Exception as e:
			self.collector_integrated_record_service.rollback_transaction()
			raise e

	def update(self, record: CollectorIntegratedRecord) -> CollectorIntegratedRecord:
		self.collector_integrated_record_service.begin_transaction()
		try:
			record = self.collector_integrated_record_service.update(record)
			self.collector_integrated_record_service.commit_transaction()
			# noinspection PyTypeChecker
			return record
		except Exception as e:
			self.collector_integrated_record_service.rollback_transaction()
			raise e

	# noinspection SpellCheckingInspection
	def is_storable_id_faked(self, record_id: str) -> bool:
		return self.collector_integrated_record_service.is_storable_id_faked(record_id)

	# noinspection SpellCheckingInspection
	def redress_storable_id(self, record: CollectorIntegratedRecord) -> CollectorIntegratedRecord:
		# noinspection PyTypeChecker
		return self.collector_integrated_record_service.redress_storable_id(record)

	def find_by_id(self, record_id: CollectorIntegratedRecordId) -> Optional[CollectorIntegratedRecord]:
		self.collector_integrated_record_service.begin_transaction()
		try:
			return self.collector_integrated_record_service.find_by_id(record_id)
		finally:
			self.collector_integrated_record_service.close_transaction()
