from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.common import IndicatorKernelException
from watchmen_inquiry_kernel.meta.enum_service import EnumerationService, EnumerationItemService
from watchmen_meta.admin import EnumService
from watchmen_meta.common import ask_snowflake_generator, ask_meta_storage
from watchmen_model.admin import Enum
from watchmen_model.common import EnumId


def get_enum_service(principal_service: PrincipalService) -> EnumerationService:
	return EnumerationService(principal_service)

def get_enum_item_service():
	return EnumerationItemService()

def ask_enum(enum_id:EnumId,principal_service: PrincipalService):

	enum_service = get_enum_service(principal_service)
	enum = enum_service.find_by_id(enum_id)
	if enum is None:
			raise IndicatorKernelException(f'Enum[id={enum_id}] not found.')
	if enum.tenantId != principal_service.get_tenant_id():
			raise IndicatorKernelException(f'Enum[id={enum_id}] not found.')
	enum.items = get_enum_item_service().find_by_enum_id(enum_id)

	return enum



