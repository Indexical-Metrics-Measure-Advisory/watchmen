from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.common import IndicatorKernelException
from watchmen_inquiry_kernel.meta import SubjectService
from watchmen_model.common import SubjectId
from watchmen_model.console import Subject


def get_subject_service(principal_service: PrincipalService) -> SubjectService:
	return SubjectService(principal_service)


def ask_subject(subject_id: SubjectId, principal_service: PrincipalService) -> Subject:
	subject = get_subject_service(principal_service).find_by_id(subject_id)
	if subject is None:
		raise IndicatorKernelException(f'Subject[id={subject_id}] not found.')
	if subject.tenantId != principal_service.get_tenant_id():
		raise IndicatorKernelException(f'Subject[id={subject_id}] not found.')

	return subject
