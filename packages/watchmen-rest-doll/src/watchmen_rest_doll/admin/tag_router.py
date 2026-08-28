from typing import List, Optional

from fastapi import APIRouter, Body, Depends

from watchmen_auth import PrincipalService
from watchmen_meta.admin import TagService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import Tag, TagType, UserRole
from watchmen_model.common import DataPage, Pageable, TagId, TenantId
from watchmen_rest import get_admin_principal, get_any_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404, validate_tenant_id
from watchmen_rest_doll.doll import ask_tuple_delete_enabled
from watchmen_rest_doll.util import trans, trans_readonly
from watchmen_utilities import is_blank

router = APIRouter()


def get_tag_service(principal_service: PrincipalService) -> TagService:
	return TagService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def to_tag_type(tag_type: Optional[str]) -> Optional[TagType]:
	if is_blank(tag_type):
		return None
	try:
		return TagType(tag_type)
	except ValueError:
		raise_400(f'Unsupported tag type[{tag_type}].')


@router.get('/tag', tags=[UserRole.ADMIN], response_model=None)
async def load_tag_by_id(
		tag_id: Optional[TagId] = None, principal_service: PrincipalService = Depends(get_admin_principal)
) -> Tag:
	if is_blank(tag_id):
		raise_400('Tag id is required.')

	tag_service = get_tag_service(principal_service)

	def action() -> Tag:
		# noinspection PyTypeChecker
		tag: Tag = tag_service.find_by_id(tag_id)
		if tag is None:
			raise_404()
		# tenant id must match current principal's
		if tag.tenantId != principal_service.get_tenant_id():
			raise_404()
		return tag

	return trans_readonly(tag_service, action)


@router.post('/tag', tags=[UserRole.ADMIN], response_model=None)
async def save_tag(
		tag: Tag, principal_service: PrincipalService = Depends(get_admin_principal)
) -> Tag:
	validate_tenant_id(tag, principal_service)
	if is_blank(tag.name):
		raise_400('Tag name is required.')
	# normalize tag type, raises 400 on unsupported type
	tag.type = to_tag_type(tag.type)
	if tag.type is None:
		raise_400('Tag type is required.')

	tag_service = get_tag_service(principal_service)

	def action(a_tag: Tag) -> Tag:
		# noinspection PyTypeChecker
		existing_tag: Optional[Tag] = tag_service.find_by_name(
			a_tag.name, a_tag.type, principal_service.get_tenant_id())
		if tag_service.is_storable_id_faked(a_tag.tagId):
			if existing_tag is not None:
				raise_400(f'Tag[name={a_tag.name}, type={a_tag.type.value}] already exists.')
			tag_service.redress_storable_id(a_tag)
			# noinspection PyTypeChecker
			a_tag: Tag = tag_service.create(a_tag)
		else:
			if existing_tag is not None and existing_tag.tagId != a_tag.tagId:
				raise_400(f'Tag[name={a_tag.name}, type={a_tag.type.value}] already exists.')
			# noinspection PyTypeChecker
			existing_by_id: Optional[Tag] = tag_service.find_by_id(a_tag.tagId)
			if existing_by_id is not None:
				if existing_by_id.tenantId != a_tag.tenantId:
					raise_403()
			# noinspection PyTypeChecker
			a_tag: Tag = tag_service.update(a_tag)
		return a_tag

	return trans(tag_service, lambda: action(tag))


class QueryTagDataPage(DataPage):
	data: List[Tag]


@router.post('/tag/name', tags=[UserRole.ADMIN], response_model=None)
async def find_tags_page_by_name(
		query_name: Optional[str], type: Optional[str] = None, pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> QueryTagDataPage:
	tag_service = get_tag_service(principal_service)

	def action() -> QueryTagDataPage:
		tenant_id: TenantId = principal_service.get_tenant_id()
		tag_type = to_tag_type(type)
		if is_blank(query_name):
			# noinspection PyTypeChecker
			return tag_service.find_by_text(None, tag_type, tenant_id, pageable)
		else:
			# noinspection PyTypeChecker
			return tag_service.find_by_text(query_name, tag_type, tenant_id, pageable)

	return trans_readonly(tag_service, action)


@router.get('/tag/list/type', tags=[UserRole.ADMIN], response_model=None)
async def find_tags_by_type(
		type: Optional[str] = None, principal_service: PrincipalService = Depends(get_admin_principal)
) -> List[Tag]:
	tag_type = to_tag_type(type)
	if tag_type is None:
		raise_400('Tag type is required.')

	tag_service = get_tag_service(principal_service)

	def action() -> List[Tag]:
		return tag_service.find_all_by_type(tag_type, principal_service.get_tenant_id())

	return trans_readonly(tag_service, action)


@router.delete('/tag', tags=[UserRole.SUPER_ADMIN, UserRole.ADMIN], response_model=None)
async def delete_tag_by_id_by_admin(
		tag_id: Optional[TagId] = None,
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> Tag:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(tag_id):
		raise_400('Tag id is required.')

	tag_service = get_tag_service(principal_service)

	def action() -> Tag:
		# noinspection PyTypeChecker
		tag: Tag = tag_service.delete(tag_id)
		if tag is None:
			raise_404()
		return tag

	return trans(tag_service, action)
