from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_inquiry_kernel.common import InquiryKernelException
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.console import SubjectService as SubjectStorageService
from watchmen_model.common import SubjectId
from watchmen_model.console import Subject


class SubjectService:
	def __init__(self, principal_service: PrincipalService):
		self.principalService = principal_service

	# noinspection DuplicatedCode
	def find_by_id(self, subject_id: SubjectId) -> Optional[Subject]:
		storage_service = SubjectStorageService(ask_meta_storage(), ask_snowflake_generator(), self.principalService)
		storage_service.begin_transaction()
		try:
			# noinspection PyTypeChecker
			subject: Subject = storage_service.find_by_id(subject_id)
			if subject is None:
				return None
			if subject.tenantId != self.principalService.get_tenant_id():
				raise InquiryKernelException(
					f'Subject[id={subject_id}] not belongs to '
					f'current tenant[id={self.principalService.get_tenant_id()}].')
			if not self.principalService.is_admin() and subject.userId != self.principalService.get_user_id():
				raise InquiryKernelException(
					f'Subject[id={subject_id}] not belongs to '
					f'current user[id={self.principalService.get_user_id()}].')

			return subject
		finally:
			storage_service.close_transaction()

	# noinspection DuplicatedCode
	def find_by_name(self, subject_name: str) -> Optional[Subject]:
		storage_service = SubjectStorageService(ask_meta_storage(), ask_snowflake_generator(), self.principalService)
		storage_service.begin_transaction()
		try:
			# noinspection PyTypeChecker
			subject: Subject = storage_service.find_by_name(subject_name)
			if subject is None:
				return None
			if subject.tenantId != self.principalService.get_tenant_id():
				raise InquiryKernelException(
					f'Subject[name={subject_name}] not belongs to '
					f'current tenant[id={self.principalService.get_tenant_id()}].')
			if not self.principalService.is_admin() and subject.userId != self.principalService.get_user_id():
				raise InquiryKernelException(
					f'Subject[name={subject_name}] not belongs to '
					f'current user[id={self.principalService.get_user_id()}].')

			return subject
		finally:
			storage_service.close_transaction()
