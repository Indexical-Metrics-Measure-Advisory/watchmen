"""RDS Engine Provider for ontology queries.

Reuses existing Watchmen DataSource metadata and RDS storage helper packages
to provide a raw SQLAlchemy Engine for the ontology SQL compiler.
"""

from typing import Dict, Optional

from sqlalchemy import Engine

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.system import DataSourceService
from watchmen_model.common import DataSourceId
from watchmen_model.system import DataSource, DataSourceType
from watchmen_rest.util import raise_400, raise_403, raise_404
from watchmen_storage import TransactionalStorageSPI


class OntologyRdsEngineProvider:
	"""Dispatches to existing RDS helpers by DataSourceType."""

	def __init__(
			self,
			principal_service: PrincipalService,
			storage: Optional[TransactionalStorageSPI] = None,
	) -> None:
		self.principal_service = principal_service
		# Reuse the caller's (typically OntologyService) storage instance to avoid
		# ask_meta_storage() returning a new instance each time, which would cause
		# connection/transaction inconsistency with the outer trans_readonly.
		self.data_source_service = DataSourceService(
			storage or ask_meta_storage(), ask_snowflake_generator(), principal_service)
		self._engines: Dict[DataSourceId, Engine] = {}

	def get_engine(self, data_source_id: DataSourceId) -> Engine:
		if data_source_id in self._engines:
			return self._engines[data_source_id]

		data_source = self.data_source_service.find_by_id(data_source_id)
		if data_source is None:
			raise_404(f'DataSource [{data_source_id}] not found.')
		if data_source.tenantId != self.principal_service.get_tenant_id():
			raise_403()

		engine = self._create_engine(data_source)
		self._engines[data_source_id] = engine
		return engine

	def _create_engine(self, data_source: DataSource) -> Engine:
		data_source_type = data_source.dataSourceType
		if data_source_type == DataSourceType.POSTGRESQL:
			from watchmen_storage_postgresql import PostgreSQLDataSourceHelper
			return PostgreSQLDataSourceHelper(data_source).engine
		elif data_source_type == DataSourceType.MYSQL:
			from watchmen_storage_mysql import MySQLDataSourceHelper
			return MySQLDataSourceHelper(data_source).engine
		elif data_source_type == DataSourceType.ORACLE:
			from watchmen_storage_oracle import OracleDataSourceHelper
			return OracleDataSourceHelper(data_source).engine
		elif data_source_type == DataSourceType.MSSQL:
			from watchmen_storage_mssql import MSSQLDataSourceHelper
			return MSSQLDataSourceHelper(data_source).engine
		else:
			raise_400(f'DataSource type [{data_source_type}] is not supported by ontology SQL query.')
