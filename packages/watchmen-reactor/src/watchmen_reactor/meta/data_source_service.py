from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.system import DataSourceService as DataSourceStorageService
from watchmen_model.common import DataSourceId
from watchmen_model.system import DataSource
from watchmen_reactor.cache import CacheService
from watchmen_reactor.common import ReactorException


class DataSourceService:
	def __init__(self, principal_service: PrincipalService):
		self.principal_service = principal_service

	def find_by_id(self, data_source_id: DataSourceId) -> Optional[DataSource]:
		data_source = CacheService.data_source().get(data_source_id)
		if data_source is not None:
			if data_source.tenantId != self.principal_service.get_tenant_id():
				raise ReactorException(
					f'Data source[id={data_source_id}] not belongs to '
					f'current tenant[id={self.principal_service.get_tenant_id()}].')
			return data_source

		storage_service = DataSourceStorageService(
			ask_meta_storage(), ask_snowflake_generator(), self.principal_service)
		storage_service.begin_transaction()
		try:
			# noinspection PyTypeChecker
			data_source: DataSource = storage_service.find_by_id(data_source_id)
			if data_source is None:
				return None

			CacheService.data_source().put(data_source)
			return data_source
		finally:
			storage_service.close_transaction()
