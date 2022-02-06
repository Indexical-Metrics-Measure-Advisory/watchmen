from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException

from watchmen_auth import PrincipalService
from watchmen_meta_service.system import ExternalWriterService
from watchmen_model.admin import UserRole
from watchmen_model.common import DataPage, ExternalWriterId, Pageable
from watchmen_model.system import ExternalWriter
from watchmen_rest.util import raise_400, raise_403, raise_404, raise_500
from watchmen_rest_doll.auth import get_any_admin_principal, get_super_admin_principal
from watchmen_rest_doll.doll import ask_meta_storage, ask_snowflake_generator, ask_tuple_delete_enabled
from watchmen_rest_doll.util import is_blank

router = APIRouter()


def get_external_writer_service(principal_service: PrincipalService) -> ExternalWriterService:
	return ExternalWriterService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get('/external_writer', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=ExternalWriter)
async def load_external_writer_by_id(
		writer_id: Optional[ExternalWriterId] = None,
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> Optional[ExternalWriter]:
	if is_blank(writer_id):
		raise_400('External writer id is required.')
	if not principal_service.is_super_admin():
		if writer_id != principal_service.get_tenant_id():
			raise_403()

	external_writer_service = get_external_writer_service(principal_service)
	external_writer_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		external_writer: ExternalWriter = external_writer_service.find_by_id(writer_id)
		if external_writer is None:
			raise_404()
		return external_writer
	except HTTPException as e:
		raise e
	except Exception as e:
		raise_500(e)
	finally:
		external_writer_service.close_transaction()


@router.post('/external_writer', tags=[UserRole.SUPER_ADMIN], response_model=ExternalWriter)
async def save_external_writer(
		external_writer: ExternalWriter, principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> ExternalWriter:
	external_writer_service = get_external_writer_service(principal_service)

	if external_writer_service.is_storable_id_faked(external_writer.external_writerId):
		external_writer_service.begin_transaction()
		try:
			external_writer_service.redress_storable_id(external_writer)
			# noinspection PyTypeChecker
			external_writer: ExternalWriter = external_writer_service.create(external_writer)
			external_writer_service.commit_transaction()
		except Exception as e:
			external_writer_service.rollback_transaction()
			raise_500(e)
	else:
		external_writer_service.begin_transaction()
		try:
			# noinspection PyTypeChecker
			external_writer: ExternalWriter = external_writer_service.update(external_writer)
			external_writer_service.commit_transaction()
		except HTTPException as e:
			external_writer_service.rollback_transaction()
			raise e
		except Exception as e:
			external_writer_service.rollback_transaction()
			raise_500(e)

	return external_writer


class QueryExternalWriterDataPage(DataPage):
	data: List[ExternalWriter]


@router.post(
	'/external_writer/name', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=QueryExternalWriterDataPage)
async def find_external_writers_by_name(
		query_name: Optional[str] = None, pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> QueryExternalWriterDataPage:
	if is_blank(query_name):
		query_name = None
	tenant_id = None
	if principal_service.is_tenant_admin():
		tenant_id = principal_service.get_tenant_id()

	external_writer_service = get_external_writer_service(principal_service)
	external_writer_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		return external_writer_service.find_by_text(query_name, tenant_id, pageable)
	except Exception as e:
		raise_500(e)
	finally:
		external_writer_service.close_transaction()


@router.get(
	"/external_writer/all", tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=List[ExternalWriter])
async def find_all_external_writers(principal_service: PrincipalService = Depends(get_any_admin_principal)):
	tenant_id = None
	if principal_service.is_tenant_admin():
		tenant_id = principal_service.get_tenant_id()

	external_writer_service = get_external_writer_service(principal_service)
	external_writer_service.begin_transaction()
	try:
		return external_writer_service.find_all(tenant_id)
	except Exception as e:
		raise_500(e)
	finally:
		external_writer_service.close_transaction()


@router.delete('/external_writer', tags=[UserRole.SUPER_ADMIN], response_model=ExternalWriter)
async def delete_external_writer_by_id(
		writer_id: Optional[ExternalWriterId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> Optional[ExternalWriter]:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(writer_id):
		raise_400('External writer id is required.')

	external_writer_service = get_external_writer_service(principal_service)
	external_writer_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		external_writer: ExternalWriter = external_writer_service.delete(writer_id)
		if external_writer is None:
			raise_404()
		external_writer_service.commit_transaction()
		return external_writer
	except HTTPException as e:
		external_writer_service.rollback_transaction()
		raise e
	except Exception as e:
		external_writer_service.rollback_transaction()
		raise_500(e)
