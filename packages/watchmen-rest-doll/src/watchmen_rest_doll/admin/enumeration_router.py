from typing import List, Optional, Tuple

from fastapi import APIRouter, Body, Depends
from pydantic import BaseModel
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_meta.admin import EnumItemService, EnumService, TopicService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import Enum, EnumItem, Topic, UserRole
from watchmen_model.common import DataPage, EnumId, Pageable, TenantId, TopicId
from watchmen_rest import get_admin_principal, get_console_principal, get_super_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404, raise_500, validate_tenant_id
from watchmen_rest_doll.doll import ask_tuple_delete_enabled
from watchmen_rest_doll.util import trans, trans_readonly
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank

router = APIRouter()


def get_enum_service(principal_service: PrincipalService) -> EnumService:
	return EnumService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_enum_item_service(enum_service: EnumService) -> EnumItemService:
	return EnumItemService(enum_service.storage, enum_service.snowflakeGenerator)


def get_topic_service(enum_service: EnumService) -> TopicService:
	return TopicService(enum_service.storage, enum_service.snowflakeGenerator, enum_service.principalService)


@router.get('/enum', tags=[UserRole.ADMIN], response_model=Enum)
async def load_enum_by_id(
		enum_id: Optional[EnumId] = None, principal_service: PrincipalService = Depends(get_console_principal)
) -> Enum:
	if is_blank(enum_id):
		raise_400('Enumeration id is required.')

	enum_service = get_enum_service(principal_service)

	def action() -> Enum:
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

	return trans_readonly(enum_service, action)


def create_enum_item(enum_item_service: EnumItemService, enum_item: EnumItem, an_enum: Enum) -> None:
	enum_item_service.redress_item_id(enum_item)
	enum_item.enumId = an_enum.enumId
	enum_item.tenantId = an_enum.tenantId
	enum_item_service.create(enum_item)


@router.post('/enum', tags=[UserRole.ADMIN], response_model=Enum)
async def save_enum(
		an_enum: Enum, principal_service: PrincipalService = Depends(get_admin_principal)
) -> Enum:
	validate_tenant_id(an_enum, principal_service)

	enum_service = get_enum_service(principal_service)

	def action(enumeration: Enum) -> Enum:
		if enum_service.is_storable_id_faked(enumeration.enumId):
			enum_service.redress_storable_id(enumeration)
			if enumeration.items is None:
				enumeration.items = []
			# noinspection PyTypeChecker
			enumeration: Enum = enum_service.create(enumeration)
			enum_item_service = get_enum_item_service(enum_service)
			ArrayHelper(enumeration.items).each(lambda x: create_enum_item(enum_item_service, x, enumeration))
		else:
			# noinspection PyTypeChecker
			existing_enum: Optional[Enum] = enum_service.find_by_id(enumeration.enumId)
			if existing_enum is not None:
				if existing_enum.tenantId != enumeration.tenantId:
					raise_403()

			if enumeration.items is None:
				enumeration.items = []
			# noinspection PyTypeChecker
			enumeration: Enum = enum_service.update(enumeration)
			enum_item_service = get_enum_item_service(enum_service)
			enum_item_service.delete_by_enum_id(enumeration.enumId)
			ArrayHelper(enumeration.items).each(lambda x: create_enum_item(enum_item_service, x, enumeration))
		return enumeration

	return trans(enum_service, lambda: action(an_enum))


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
	enum_service = get_enum_service(principal_service)

	def action() -> QueryEnumDataPage:
		tenant_id: TenantId = principal_service.get_tenant_id()
		if is_blank(query_name):
			# noinspection PyTypeChecker
			return enum_service.find_by_text(None, tenant_id, pageable)
		else:
			# noinspection PyTypeChecker
			return enum_service.find_by_text(query_name, tenant_id, pageable)

	return trans_readonly(enum_service, action)


@router.get('/enum/list/topic', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=List[Enum])
async def find_enums_by_topic(
		topic_id: Optional[TopicId], principal_service: PrincipalService = Depends(get_console_principal)
) -> List[Enum]:
	"""
	find enumerations by given topic
	"""
	if is_blank(topic_id):
		raise_400('Topic id is required.')

	enum_service = get_enum_service(principal_service)

	def action() -> List[Enum]:
		topic_service = get_topic_service(enum_service)
		topic: Optional[Topic] = topic_service.find_by_id(topic_id)
		if topic.tenantId != principal_service.get_tenant_id():
			raise_403()
		return ArrayHelper(topic.factors) \
			.filter(lambda x: is_not_blank(x.enumId)) \
			.map(lambda x: enum_service.find_by_id(x.enumId)) \
			.to_list()

	return trans_readonly(enum_service, action)


@router.get('/enum/all', tags=[UserRole.ADMIN], response_model=List[Enum])
async def find_all_enums(principal_service: PrincipalService = Depends(get_admin_principal)) -> List[Enum]:
	"""
	no enumeration items included, only enumeration itself
	"""
	enum_service = get_enum_service(principal_service)

	def action() -> List[Enum]:
		tenant_id = principal_service.get_tenant_id()
		return enum_service.find_all(tenant_id)

	return trans_readonly(enum_service, action)


class ImportEnumItems(BaseModel):
	enumId: Optional[EnumId] = None
	name: Optional[str] = None
	items: List[EnumItem]


@router.post('/enum/items/import', tags=[UserRole.ADMIN], response_class=Response)
async def items_import(
		import_items_list: List[ImportEnumItems], principal_service: PrincipalService = Depends(get_admin_principal)
) -> None:
	if import_items_list is None or len(import_items_list) == 0:
		return

	enum_service = get_enum_service(principal_service)
	enum_item_service = get_enum_item_service(enum_service)

	def find_enum(import_items: ImportEnumItems) -> Tuple[Enum, List[EnumItem]]:
		enum_id = import_items.enumId
		name = import_items.name
		if is_blank(enum_id) and is_blank(name):
			raise_400('At least one of enumeration id and name must be provided.')

		enumeration = None
		if is_not_blank(enum_id):
			# both provided, find by id
			enumeration = enum_service.find_by_id(enum_id)
		elif is_not_blank(name):
			enumeration = enum_service.find_by_name(name, principal_service.get_tenant_id())

		if enumeration is not None:
			# found
			if enumeration.tenantId != principal_service.get_tenant_id():
				raise_404(f'Enumeration[id={enum_id}, name={name}] not found.')
		elif is_not_blank(name):
			# not found, but name is given, create one
			enumeration = Enum(
				enumId=enum_id,
				name=name,
				tenantId=principal_service.get_tenant_id(),
				items=[]
			)
			enum_service.create(enumeration)
		else:
			raise_404(f'Enumeration[id={enum_id}, name={name}] not found.')

		return enumeration, import_items.items

	def save_items(enumeration: Enum, items: List[EnumItem]) -> None:
		enum_item_service.delete_by_enum_id(enumeration.enumId)
		ArrayHelper(items).each(lambda x: create_enum_item(enum_item_service, x, enumeration))

	def action() -> None:
		ArrayHelper(import_items_list).map(lambda x: find_enum(x)).each(lambda x: save_items(x[0], x[1]))

	return trans(enum_service, action)


@router.delete('/enum', tags=[UserRole.SUPER_ADMIN], response_model=Enum)
async def delete_enum_by_id_by_super_admin(
		enum_id: Optional[EnumId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> Enum:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(enum_id):
		raise_400('Enumeration id is required.')

	enum_service = get_enum_service(principal_service)

	def action() -> Enum:
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
		return an_enum

	return trans(enum_service, action)
