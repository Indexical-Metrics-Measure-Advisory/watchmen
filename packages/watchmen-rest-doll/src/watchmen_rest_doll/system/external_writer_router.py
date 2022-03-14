from typing import List, Optional

from fastapi import APIRouter, Body, Depends

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.system import ExternalWriterService
from watchmen_model.admin import UserRole
from watchmen_model.common import DataPage, ExternalWriterId, Pageable
from watchmen_model.system import ExternalWriter
from watchmen_rest import get_any_admin_principal, get_super_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404
from watchmen_rest_doll.doll import ask_tuple_delete_enabled
from watchmen_rest_doll.util import trans, trans_readonly
from watchmen_utilities import is_blank

router = APIRouter()


def get_external_writer_service(principal_service: PrincipalService) -> ExternalWriterService:
	return ExternalWriterService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get('/external_writer', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=ExternalWriter)
async def load_external_writer_by_id(
		writer_id: Optional[ExternalWriterId] = None,
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> ExternalWriter:
	if is_blank(writer_id):
		raise_400('External writer id is required.')
	if not principal_service.is_super_admin():
		if writer_id != principal_service.get_tenant_id():
			raise_403()

	external_writer_service = get_external_writer_service(principal_service)

	def action() -> ExternalWriter:
		# noinspection PyTypeChecker
		external_writer: ExternalWriter = external_writer_service.find_by_id(writer_id)
		if external_writer is None:
			raise_404()
		return external_writer

	return trans_readonly(external_writer_service, action)


@router.post('/external_writer', tags=[UserRole.SUPER_ADMIN], response_model=ExternalWriter)
async def save_external_writer(
		external_writer: ExternalWriter, principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> ExternalWriter:
	external_writer_service = get_external_writer_service(principal_service)

	# noinspection DuplicatedCode
	def action(writer: ExternalWriter) -> ExternalWriter:
		if external_writer_service.is_storable_id_faked(writer.writerId):
			external_writer_service.redress_storable_id(writer)
			# noinspection PyTypeChecker
			writer: ExternalWriter = external_writer_service.create(writer)
		else:
			# noinspection PyTypeChecker
			writer: ExternalWriter = external_writer_service.update(writer)

		return writer

	return trans(external_writer_service, lambda: action(external_writer))


class QueryExternalWriterDataPage(DataPage):
	data: List[ExternalWriter]


@router.post(
	'/external_writer/name', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=QueryExternalWriterDataPage)
async def find_external_writers_by_name(
		query_name: Optional[str] = None, pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> QueryExternalWriterDataPage:
	external_writer_service = get_external_writer_service(principal_service)

	# noinspection DuplicatedCode
	def action() -> QueryExternalWriterDataPage:
		tenant_id = None
		if principal_service.is_tenant_admin():
			tenant_id = principal_service.get_tenant_id()
		if is_blank(query_name):
			# noinspection PyTypeChecker
			return external_writer_service.find_by_text(None, tenant_id, pageable)
		else:
			# noinspection PyTypeChecker
			return external_writer_service.find_by_text(query_name, tenant_id, pageable)

	return trans_readonly(external_writer_service, action)


@router.get(
	"/external_writer/all", tags=[UserRole.ADMIN], response_model=List[ExternalWriter])
async def find_all_external_writers(
		principal_service: PrincipalService = Depends(get_any_admin_principal)) -> List[ExternalWriter]:
	tenant_id = None
	if principal_service.is_tenant_admin():
		tenant_id = principal_service.get_tenant_id()

	external_writer_service = get_external_writer_service(principal_service)

	def action() -> List[ExternalWriter]:
		return external_writer_service.find_all(tenant_id)

	return trans_readonly(external_writer_service, action)


@router.delete('/external_writer', tags=[UserRole.SUPER_ADMIN], response_model=ExternalWriter)
async def delete_external_writer_by_id(
		writer_id: Optional[ExternalWriterId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> ExternalWriter:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(writer_id):
		raise_400('External writer id is required.')

	external_writer_service = get_external_writer_service(principal_service)

	def action() -> ExternalWriter:
		# noinspection PyTypeChecker
		external_writer: ExternalWriter = external_writer_service.delete(writer_id)
		if external_writer is None:
			raise_404()
		return external_writer

	return trans(external_writer_service, action)
