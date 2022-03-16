from typing import List, Optional

from fastapi import APIRouter, Body, Depends
from watchmen_auth import PrincipalService
from watchmen_data_kernel.cache import CacheService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.system import DataSourceService
from watchmen_model.admin import UserRole
from watchmen_model.common import DataPage, DataSourceId, Pageable
from watchmen_model.system import DataSource
from watchmen_rest import get_any_admin_principal, get_super_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404
from watchmen_utilities import is_blank

from watchmen_rest_doll.doll import ask_tuple_delete_enabled
from watchmen_rest_doll.util import trans, trans_readonly

router = APIRouter()


def get_data_source_service(principal_service: PrincipalService) -> DataSourceService:
	return DataSourceService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get('/datasource', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=DataSource)
async def load_data_source_by_id(
		data_source_id: Optional[DataSourceId] = None,
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> DataSource:
	if is_blank(data_source_id):
		raise_400('Data source id is required.')
	if not principal_service.is_super_admin():
		if data_source_id != principal_service.get_tenant_id():
			raise_403()

	data_source_service = get_data_source_service(principal_service)

	def action() -> DataSource:
		# noinspection PyTypeChecker
		data_source: DataSource = data_source_service.find_by_id(data_source_id)
		if data_source is None:
			raise_404()
		return data_source

	return trans_readonly(data_source_service, action)


@router.post('/datasource', tags=[UserRole.SUPER_ADMIN], response_model=DataSource)
async def save_data_source(
		data_source: DataSource, principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> DataSource:
	data_source_service = get_data_source_service(principal_service)

	# noinspection DuplicatedCode
	def action(a_data_source: DataSource) -> DataSource:
		if data_source_service.is_storable_id_faked(a_data_source.dataSourceId):
			data_source_service.redress_storable_id(a_data_source)
			# noinspection PyTypeChecker
			a_data_source: DataSource = data_source_service.create(a_data_source)
		else:
			# noinspection PyTypeChecker
			a_data_source: DataSource = data_source_service.update(a_data_source)
		CacheService.data_source().put(a_data_source)
		return a_data_source

	return trans(data_source_service, lambda: action(data_source))


class QueryDataSourceDataPage(DataPage):
	data: List[DataSource]


@router.post('/datasource/name', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=QueryDataSourceDataPage)
async def find_data_sources_by_name(
		query_name: Optional[str] = None, pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> QueryDataSourceDataPage:
	data_source_service = get_data_source_service(principal_service)

	# noinspection DuplicatedCode
	def action() -> QueryDataSourceDataPage:
		tenant_id = None
		if principal_service.is_tenant_admin():
			tenant_id = principal_service.get_tenant_id()
		if is_blank(query_name):
			# noinspection PyTypeChecker
			return data_source_service.find_by_text(None, tenant_id, pageable)
		else:
			# noinspection PyTypeChecker
			return data_source_service.find_by_text(query_name, tenant_id, pageable)

	return trans_readonly(data_source_service, action)


@router.get('/datasource/all', tags=[UserRole.ADMIN], response_model=List[DataSource])
async def find_all_data_sources(
		principal_service: PrincipalService = Depends(get_any_admin_principal)) -> List[DataSource]:
	data_source_service = get_data_source_service(principal_service)

	def action() -> List[DataSource]:
		tenant_id = None
		if principal_service.is_tenant_admin():
			tenant_id = principal_service.get_tenant_id()
		return data_source_service.find_all(tenant_id)

	return trans_readonly(data_source_service, action)


@router.delete('/datasource', tags=[UserRole.SUPER_ADMIN], response_model=DataSource)
async def delete_data_source_by_id_by_super_admin(
		data_source_id: Optional[DataSourceId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> DataSource:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(data_source_id):
		raise_400('Data source id is required.')

	data_source_service = get_data_source_service(principal_service)

	def action() -> DataSource:
		# noinspection PyTypeChecker
		data_source: DataSource = data_source_service.delete(data_source_id)
		if data_source is None:
			raise_404()
		CacheService.data_source().remove(data_source_id)
		return data_source

	return trans(data_source_service, action)
