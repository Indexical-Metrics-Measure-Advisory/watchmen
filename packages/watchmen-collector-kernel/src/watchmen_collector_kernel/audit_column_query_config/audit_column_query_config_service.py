from typing import List, Optional

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import CollectorAuditColumnQueryConfig
from watchmen_collector_kernel.service import get_collector_audit_column_query_config_service
from watchmen_model.common import CollectorAuditColumnQueryConfigId
from watchmen_storage import TransactionalStorageSPI, SnowflakeGenerator


class ConfigHierarchy:

	def __init__(self, configs: List[CollectorAuditColumnQueryConfig]):
		self.configs = configs

	def capture_change_data(self):
		pass  # todo

	def build_json(self):
		pass  # todo

	def listener(self):
		pass  # todo


class AuditColumnQueryConfigService:

	def __init__(self, storage: TransactionalStorageSPI,
	             snowflake_generator: SnowflakeGenerator,
	             principal_service: PrincipalService):
		self.storage = storage
		self.snowflakeGenerator = snowflake_generator
		self.collector_audit_column_query_config_service = \
			get_collector_audit_column_query_config_service(self.storage, self.snowflakeGenerator, principal_service)

	# noinspection PyTypeChecker
	def create_config(self, config: CollectorAuditColumnQueryConfig) -> CollectorAuditColumnQueryConfig:
		self.collector_audit_column_query_config_service.begin_transaction()
		try:
			config = self.collector_audit_column_query_config_service.create(config)
			self.collector_audit_column_query_config_service.commit_transaction()
			return config
		except Exception as e:
			self.collector_audit_column_query_config_service.rollback_transaction()
			raise e

	# noinspection PyTypeChecker
	def update_config(self, config: CollectorAuditColumnQueryConfig) -> CollectorAuditColumnQueryConfig:
		self.collector_audit_column_query_config_service.begin_transaction()
		try:
			config = self.collector_audit_column_query_config_service.update(config)
			self.collector_audit_column_query_config_service.commit_transaction()
			return config
		except Exception as e:
			self.collector_audit_column_query_config_service.rollback_transaction()
			raise e

	# noinspection SpellCheckingInspection
	def is_storable_id_faked(self, config_id: str) -> bool:
		return self.collector_audit_column_query_config_service.is_storable_id_faked(config_id)

	# noinspection SpellCheckingInspection
	def redress_storable_id(self, config: CollectorAuditColumnQueryConfig) -> CollectorAuditColumnQueryConfig:
		# noinspection PyTypeChecker
		return self.collector_audit_column_query_config_service.redress_storable_id(config)

	def find_by_id(self, config_id: CollectorAuditColumnQueryConfigId) -> Optional[CollectorAuditColumnQueryConfig]:
		self.collector_audit_column_query_config_service.begin_transaction()
		try:
			return self.collector_audit_column_query_config_service.find_by_id(config_id)
		finally:
			self.collector_audit_column_query_config_service.close_transaction()

