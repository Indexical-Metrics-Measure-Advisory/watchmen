"""Ontology 查询使用的 RDS Engine Provider。

复用 Watchmen 现有 DataSource 元数据和各 RDS storage 包的 DataSourceHelper，
为 Ontology SQL 编译器提供裸 SQLAlchemy Engine。
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
	"""按 DataSourceType 分发到现有 RDS helper。"""

	def __init__(
			self,
			principal_service: PrincipalService,
			storage: Optional[TransactionalStorageSPI] = None,
	) -> None:
		self.principal_service = principal_service
		# 复用调用方（通常是 OntologyService）的 storage 实例，避免 ask_meta_storage()
		# 每次返回新实例导致 connection/事务与外层 trans_readonly 不一致。
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
