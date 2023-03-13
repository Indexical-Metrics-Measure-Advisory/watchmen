from typing import Optional, List

from watchmen_auth import PrincipalService
from watchmen_inquiry_kernel.common import InquiryKernelException
from watchmen_meta.admin import EnumService, EnumItemService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import Enum, EnumItem
from watchmen_model.common import EnumId



class EnumerationService:
	def __init__(self, principal_service: PrincipalService):
		self.principalService = principal_service

	# noinspection DuplicatedCode
	def find_by_id(self, enum_id: EnumId) -> Optional[Enum]:
		storage_service = EnumService(ask_meta_storage(), ask_snowflake_generator(), self.principalService)
		storage_service.begin_transaction()
		try:
			# noinspection PyTypeChecker
			enum: Enum = storage_service.find_by_id(enum_id)
			if enum is None:
				return None
			if enum.tenantId != self.principalService.get_tenant_id():
				raise InquiryKernelException(
					f'enum[id={enum_id}] not belongs to '
					f'current tenant[id={self.principalService.get_tenant_id()}].')
			if not self.principalService.is_admin() and enum.userId != self.principalService.get_user_id():
				raise InquiryKernelException(
					f'enum[id={enum_id}] not belongs to '
					f'current user[id={self.principalService.get_user_id()}].')

			return enum
		finally:
			storage_service.close_transaction()


class EnumerationItemService:
	# def __init__(self, enum_service: EnumService):
	# 	self.enum_service = enum_service

	def find_by_enum_id(self,enum_id:EnumId):
		enum_item_service = EnumItemService(ask_meta_storage(), ask_snowflake_generator())
		enum_item_service.storage.begin()
		try:

			enum_list: List[EnumItem] = enum_item_service.find_by_enum_id(enum_id)
			if enum_list is None:
				return []

			return enum_list
		finally:
			enum_item_service.storage.close()

