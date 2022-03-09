from watchmen_auth import PrincipalService
from watchmen_model.common import DataPage, DataResult, Pageable
from watchmen_model.console import Report, Subject
from .subject_data_service import SubjectDataService


class ReportDataService:
	def __init__(self, subject: Subject, report: Report, principal_service: PrincipalService):
		self.subject_data_service = SubjectDataService(subject, principal_service)
		self.report = report
		self.principalService = principal_service

	def find(self) -> DataResult:
		pass

	def page(self, pageable: Pageable) -> DataPage:
		pass
