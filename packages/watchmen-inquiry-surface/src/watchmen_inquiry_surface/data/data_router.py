from typing import Optional

from fastapi import APIRouter, Body, Depends

from watchmen_auth import PrincipalService
from watchmen_inquiry_kernel.meta import SubjectService
from watchmen_inquiry_kernel.storage import SubjectDataService
from watchmen_model.admin import UserRole
from watchmen_model.common import DataPage, DataResult, Pageable, ReportId, SubjectId
from watchmen_model.console import Report, Subject
from watchmen_model.console.subject import SubjectDatasetCriteria
from watchmen_rest import get_console_principal
from watchmen_rest.util import raise_400
from watchmen_utilities import is_blank

router = APIRouter()


def get_subject_service(principal_service: PrincipalService) -> SubjectService:
	return SubjectService(principal_service)


def get_subject_data_service(subject: Subject, principal_service: PrincipalService) -> SubjectDataService:
	return SubjectDataService(subject, principal_service)


@router.post('/subject/data', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=DataPage)
async def fetch_subject_data(
		subject_id: Optional[SubjectId], pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_console_principal)) -> DataPage:
	if is_blank(subject_id):
		raise_400('Subject id is required.')

	subject: Optional[Subject] = get_subject_service(principal_service).find_by_id(subject_id)
	if subject is None:
		raise_400(f'Incorrect subject id[{subject_id}].')

	return get_subject_data_service(subject, principal_service).page(pageable)


@router.get('/report/data', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=DataResult)
async def fetch_report_data(
		report_id: Optional[ReportId],
		principal_service: PrincipalService = Depends(get_console_principal)) -> DataResult:
	# TODO fetch report data
	pass


@router.post('/report/temporary', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=DataResult)
async def fetch_report_data_temporary(
		report: Report,
		principal_service: PrincipalService = Depends(get_console_principal)) -> DataResult:
	# TODO fetch report data temporary
	pass


@router.post('/subject/data/criteria', tags=[UserRole.ADMIN], response_model=DataResult)
async def query_dataset(
		query: SubjectDatasetCriteria,
		principal_service: PrincipalService = Depends(get_console_principal)) -> DataResult:
	# console_subject = load_console_subject_by_name(query.subject_name, current_user)
	# data = build_query_for_consume(console_subject, query.indicators, query.where, current_user)
	# return {"data": data}
	# TODO fetch dataset
	pass
