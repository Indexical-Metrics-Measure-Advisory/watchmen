from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException

from watchmen_auth import PrincipalService
from watchmen_meta_service.admin import EnumItemService, EnumService
from watchmen_model.admin import Enum, EnumItem, UserRole
from watchmen_model.common import DataPage, EnumId, Pageable, TenantId
from watchmen_rest.util import raise_400, raise_403, raise_404, raise_500
from watchmen_rest_doll.auth import get_admin_principal, get_console_principal, get_super_admin_principal
from watchmen_rest_doll.doll import ask_meta_storage, ask_snowflake_generator, ask_tuple_delete_enabled
from watchmen_rest_doll.util import is_blank, validate_tenant_id
from watchmen_utilities import ArrayHelper

router = APIRouter()


def get_enum_service(principal_service: PrincipalService) -> EnumService:
	return EnumService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_enum_item_service(enum_service: EnumService) -> EnumItemService:
	return EnumItemService(enum_service.storage, enum_service.snowflake_generator)


@router.get('/enum', tags=[UserRole.ADMIN], response_model=Enum)
async def load_enum_by_id(
		enum_id: Optional[EnumId] = None, principal_service: PrincipalService = Depends(get_console_principal)
) -> Optional[Enum]:
	if is_blank(enum_id):
		raise_400('Enumeration id is required.')

	enum_service = get_enum_service(principal_service)
	enum_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		an_enum: Enum = enum_service.find_by_id(enum_id)
		if an_enum is None:
			raise_404()
		# tenant id must match current principal's
		if an_enum.tenantId != principal_service.get_tenant_id():
			raise_404()
		enum_item_service = get_enum_item_service(enum_service)
		enum_list: List[EnumItem] = enum_item_service.find_by_enum_id(enum_id)
		if ArrayHelper(enum_list).some(lambda x: x.tenantId != principal_service.get_tenant_id()):
			raise_500(
				None,
				f'Items of enumeration[enumId={an_enum.enumId}] has incorrect data, '
				'check and correct it at meta storage manually.')
		if enum_list is None:
			an_enum.items = []
		else:
			an_enum.items = enum_list
		return an_enum
	except HTTPException as e:
		raise e
	except Exception as e:
		raise_500(e)
	finally:
		enum_service.close_transaction()


def create_enum_item(enum_item_service: EnumItemService, enum_item: EnumItem, an_enum: Enum) -> None:
	enum_item_service.redress_item_id(enum_item)
	enum_item.enumId = an_enum.enumId
	enum_item.tenantId = an_enum.tenantId
	enum_item_service.create(enum_item)


@router.post("/enum", tags=[UserRole.ADMIN], response_model=Enum)
async def save_enum(
		an_enum: Enum, principal_service: PrincipalService = Depends(get_admin_principal)
) -> Enum:
	validate_tenant_id(an_enum, principal_service)

	enum_service = get_enum_service(principal_service)

	if enum_service.is_tuple_id_faked(an_enum.enumId):
		enum_service.begin_transaction()
		try:
			enum_service.redress_tuple_id(an_enum)
			if an_enum.items is None:
				an_enum.items = []
			# noinspection PyTypeChecker
			an_enum: Enum = enum_service.create(an_enum)
			enum_item_service = get_enum_item_service(enum_service)
			ArrayHelper(an_enum.items).each(lambda x: create_enum_item(enum_item_service, x, an_enum))
			enum_service.commit_transaction()
		except Exception as e:
			enum_service.rollback_transaction()
			raise_500(e)
	else:
		enum_service.begin_transaction()
		try:
			# noinspection PyTypeChecker
			existing_enum: Optional[Enum] = enum_service.find_by_id(an_enum.enumId)
			if existing_enum is not None:
				if existing_enum.tenantId != an_enum.tenantId:
					raise_403()

			if an_enum.items is None:
				an_enum.items = []
			# noinspection PyTypeChecker
			an_enum: Enum = enum_service.update(an_enum)
			enum_item_service = get_enum_item_service(enum_service)
			enum_item_service.delete_by_enum_id(an_enum.enumId)
			ArrayHelper(an_enum.items).each(lambda x: create_enum_item(enum_item_service, x, an_enum))
			enum_service.commit_transaction()
		except HTTPException as e:
			enum_service.rollback_transaction()
			raise e
		except Exception as e:
			enum_service.rollback_transaction()
			raise_500(e)

	return an_enum


class QueryEnumDataPage(DataPage):
	data: List[Enum]


@router.post('/enum/name', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=QueryEnumDataPage)
async def find_enums_by_name(
		query_name: Optional[str], pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_console_principal)
) -> QueryEnumDataPage:
	"""
	no enumeration items included, only enumeration itself
	"""
	tenant_id: TenantId = principal_service.get_tenant_id()
	if is_blank(query_name):
		query_name = None

	enum_service = get_enum_service(principal_service)
	enum_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		return enum_service.find_by_text(query_name, tenant_id, pageable)
	except Exception as e:
		raise_500(e)
	finally:
		enum_service.close_transaction()


@router.get("/enum/all", tags=[UserRole.ADMIN], response_model=List[Enum])
async def find_all_enums(principal_service: PrincipalService = Depends(get_console_principal)) -> List[Enum]:
	"""
	no enumeration items included, only enumeration itself
	"""
	tenant_id = principal_service.get_tenant_id()

	enum_service = get_enum_service(principal_service)
	enum_service.begin_transaction()
	try:
		return enum_service.find_all(tenant_id)
	except Exception as e:
		raise_500(e)
	finally:
		enum_service.close_transaction()


@router.delete('/enum', tags=[UserRole.SUPER_ADMIN], response_model=Enum)
async def delete_enum_by_id(
		enum_id: Optional[EnumId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> Optional[Enum]:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(enum_id):
		raise_400('Enumeration id is required.')

	enum_service = get_enum_service(principal_service)
	enum_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		an_enum: Enum = enum_service.delete(enum_id)
		if an_enum is None:
			raise_404()
		enum_item_service = get_enum_item_service(enum_service)
		enum_items = enum_item_service.find_by_enum_id(an_enum.enumId)
		if enum_items is None:
			an_enum.items = []
		else:
			an_enum.items = enum_items
		enum_item_service.delete_by_enum_id(an_enum.enumId)
		enum_service.commit_transaction()
		return an_enum
	except HTTPException as e:
		enum_service.rollback_transaction()
		raise e
	except Exception as e:
		enum_service.rollback_transaction()
		raise_500(e)
