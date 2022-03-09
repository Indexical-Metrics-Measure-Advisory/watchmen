from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_inquiry_kernel.common import InquiryKernelException
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.console import ReportService as ReportStorageService
from watchmen_model.common import ReportId
from watchmen_model.console import Report


class ReportService:
	def __init__(self, principal_service: PrincipalService):
		self.principalService = principal_service

	# noinspection DuplicatedCode
	def find_by_id(self, report_id: ReportId) -> Optional[Report]:
		storage_service = ReportStorageService(ask_meta_storage(), ask_snowflake_generator(), self.principalService)
		storage_service.begin_transaction()
		try:
			# noinspection PyTypeChecker
			report: Report = storage_service.find_by_id(report_id)
			if report is None:
				return None
			if report.tenantId != self.principalService.get_tenant_id():
				raise InquiryKernelException(
					f'Report[id={report_id}] not belongs to '
					f'current tenant[id={self.principalService.get_tenant_id()}].')
			if not self.principalService.is_admin() and report.userId != self.principalService.get_user_id():
				raise InquiryKernelException(
					f'Report[id={report_id}] not belongs to '
					f'current user[id={self.principalService.get_user_id()}].')

			return report
		finally:
			storage_service.close_transaction()
