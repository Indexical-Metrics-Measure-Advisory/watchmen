from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException

from watchmen_auth import PrincipalService
from watchmen_meta_service.system import DataSourceService
from watchmen_model.admin import UserRole
from watchmen_model.common import DataPage, Pageable
from watchmen_model.system import DataSource
from watchmen_rest.util import raise_400, raise_403, raise_404, raise_500
from watchmen_rest_doll.auth import get_any_admin_principal, get_super_admin_principal
from watchmen_rest_doll.doll import ask_meta_storage, ask_snowflake_generator, ask_tuple_delete_enabled
from watchmen_rest_doll.util import is_blank

router = APIRouter()


def get_data_source_service(principal_service: PrincipalService) -> DataSourceService:
	return DataSourceService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get('/datasource', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=DataSource)
async def load_data_source_by_id(
		data_source_id: Optional[str] = None,
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> Optional[DataSource]:
	if is_blank(data_source_id):
		raise_400('Data source id is required.')
	if not principal_service.is_super_admin():
		if data_source_id != principal_service.get_tenant_id():
			raise_403()

	data_source_service = get_data_source_service(principal_service)
	data_source_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		data_source: DataSource = data_source_service.find_by_id(data_source_id)
		if data_source is None:
			raise_404()
		return data_source
	except HTTPException as e:
		raise e
	except Exception as e:
		raise_500(e)
	finally:
		data_source_service.close_transaction()


@router.post('/datasource', tags=[UserRole.SUPER_ADMIN], response_model=DataSource)
async def save_data_source(
		data_source: DataSource, principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> DataSource:
	data_source_service = get_data_source_service(principal_service)

	if data_source_service.is_tuple_id_faked(data_source.data_sourceId):
		data_source_service.begin_transaction()
		try:
			data_source_service.redress_tuple_id(data_source)
			# noinspection PyTypeChecker
			data_source: DataSource = data_source_service.create(data_source)
			data_source_service.commit_transaction()
		except Exception as e:
			data_source_service.rollback_transaction()
			raise_500(e)
	else:
		data_source_service.begin_transaction()
		try:
			# noinspection PyTypeChecker
			data_source: DataSource = data_source_service.update(data_source)
			data_source_service.commit_transaction()
		except HTTPException as e:
			raise e
		except Exception as e:
			data_source_service.rollback_transaction()
			raise_500(e)

	return data_source


@router.post('/datasource/name', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=DataPage)
async def find_data_sources_by_name(
		query_name: Optional[str] = None, pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> DataPage:
	if is_blank(query_name):
		query_name = None
	tenant_id = None
	if principal_service.is_tenant_admin():
		tenant_id = principal_service.get_tenant_id()

	data_source_service = get_data_source_service(principal_service)
	data_source_service.begin_transaction()
	try:
		return data_source_service.find_data_sources_by_text(query_name, tenant_id, pageable)
	except Exception as e:
		raise_500(e)
	finally:
		data_source_service.close_transaction()


@router.get(
	"/datasource/all", tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=List[DataSource])
async def load_all_data_sources(principal_service: PrincipalService = Depends(get_any_admin_principal)):
	tenant_id = None
	if principal_service.is_tenant_admin():
		tenant_id = principal_service.get_tenant_id()

	data_source_service = get_data_source_service(principal_service)
	data_source_service.begin_transaction()
	try:
		return data_source_service.find_data_sources(tenant_id)
	except Exception as e:
		raise_500(e)
	finally:
		data_source_service.close_transaction()


@router.delete('/datasource', tags=[UserRole.SUPER_ADMIN], response_model=DataSource)
async def delete_data_source_by_id(
		data_source_id: Optional[str] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> Optional[DataSource]:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(data_source_id):
		raise_400('DataSource id is required.')
	if not principal_service.is_super_admin():
		raise_403()

	data_source_service = get_data_source_service(principal_service)
	data_source_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		data_source: DataSource = data_source_service.delete(data_source_id)
		if data_source is None:
			raise_404()
		data_source_service.commit_transaction()
		return data_source
	except HTTPException as e:
		data_source_service.rollback_transaction()
		raise e
	except Exception as e:
		data_source_service.rollback_transaction()
		raise_500(e)
