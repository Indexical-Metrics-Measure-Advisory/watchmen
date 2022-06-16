from typing import Callable, List, Optional

from fastapi import APIRouter, Depends
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.meta import ObjectiveAnalysisService
from watchmen_indicator_surface.settings import ask_tuple_delete_enabled
from watchmen_indicator_surface.util import trans, trans_readonly
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_model.common import ObjectiveAnalysisId, TenantId, UserId
from watchmen_model.indicator import ObjectiveAnalysis
from watchmen_rest import get_console_principal, get_super_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404
from watchmen_utilities import is_blank

router = APIRouter()


def get_analysis_service(principal_service: PrincipalService) -> ObjectiveAnalysisService:
	return ObjectiveAnalysisService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get('/indicator/objective-analysis', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=ObjectiveAnalysis)
async def load_analysis_by_id(
		analysis_id: Optional[ObjectiveAnalysisId], principal_service: PrincipalService = Depends(get_console_principal)
) -> ObjectiveAnalysis:
	if is_blank(analysis_id):
		raise_400('Objective analysis id is required.')

	analysis_service = get_analysis_service(principal_service)

	# noinspection DuplicatedCode
	def action() -> ObjectiveAnalysis:
		# noinspection PyTypeChecker
		analysis: ObjectiveAnalysis = analysis_service.find_by_id(analysis_id)
		if analysis is None:
			raise_404()
		# user id must match current principal's
		if analysis.userId != principal_service.get_user_id():
			raise_404()
		# tenant id must match current principal's
		if analysis.tenantId != principal_service.get_tenant_id():
			raise_404()
		return analysis

	return trans_readonly(analysis_service, action)


# noinspection DuplicatedCode
def ask_save_analysis_action(
		analysis_service: ObjectiveAnalysisService, principal_service: PrincipalService
) -> Callable[[ObjectiveAnalysis], ObjectiveAnalysis]:
	# noinspection DuplicatedCode
	def action(analysis: ObjectiveAnalysis) -> ObjectiveAnalysis:
		analysis.userId = principal_service.get_user_id()
		analysis.tenantId = principal_service.get_tenant_id()
		if analysis_service.is_storable_id_faked(analysis.analysisId):
			analysis_service.redress_storable_id(analysis)
			# noinspection PyTypeChecker
			analysis: ObjectiveAnalysis = analysis_service.create(analysis)
		else:
			existing_inspection: Optional[ObjectiveAnalysis] = analysis_service.find_by_id(analysis.analysisId)
			if existing_inspection is not None:
				if existing_inspection.tenantId != analysis.tenantId:
					raise_403()
				if existing_inspection.userId != analysis.userId:
					raise_403()

			# noinspection PyTypeChecker
			analysis: ObjectiveAnalysis = analysis_service.update(analysis)
		return analysis

	return action


@router.post('/indicator/objective-analysis', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=ObjectiveAnalysis)
async def save_analysis(
		analysis: ObjectiveAnalysis, principal_service: PrincipalService = Depends(get_console_principal)
) -> ObjectiveAnalysis:
	analysis_service = get_analysis_service(principal_service)
	action = ask_save_analysis_action(analysis_service, principal_service)
	return trans(analysis_service, lambda: action(analysis))


@router.get(
	'/indicator/objective-analysis/list', tags=[UserRole.CONSOLE, UserRole.ADMIN],
	response_model=List[ObjectiveAnalysis])
async def find_my_analysis(
		principal_service: PrincipalService = Depends(get_console_principal)
) -> List[ObjectiveAnalysis]:
	analysis_service = get_analysis_service(principal_service)

	def action() -> List[ObjectiveAnalysis]:
		user_id: UserId = principal_service.get_user_id()
		tenant_id: TenantId = principal_service.get_tenant_id()
		# noinspection PyTypeChecker
		return analysis_service.find_all_by_user_id(user_id, tenant_id)

	return trans_readonly(analysis_service, action)


@router.get('/indicator/objective-analysis/delete', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_class=Response)
async def delete_connected_space_by_id(
		analysis_id: Optional[ObjectiveAnalysisId], principal_service: PrincipalService = Depends(get_console_principal)
) -> None:
	if is_blank(analysis_id):
		raise_400('Objective analysis id is required.')

	analysis_service = get_analysis_service(principal_service)

	# noinspection DuplicatedCode
	def action() -> None:
		# noinspection PyTypeChecker
		existing_analysis: Optional[ObjectiveAnalysis] = analysis_service.find_by_id(analysis_id)
		if existing_analysis is None:
			raise_404()
		if existing_analysis.tenantId != principal_service.get_tenant_id():
			raise_403()
		if not principal_service.is_tenant_admin() and existing_analysis.userId != principal_service.get_user_id():
			raise_403()
		analysis_service.delete(analysis_id)

	trans(analysis_service, action)


@router.delete('/indicator/objective-analysis', tags=[UserRole.SUPER_ADMIN], response_model=ObjectiveAnalysis)
async def delete_analysis_by_id_by_super_admin(
		analysis_id: Optional[ObjectiveAnalysisId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> ObjectiveAnalysis:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(analysis_id):
		raise_400('Objective analysis id is required.')

	analysis_service = get_analysis_service(principal_service)

	def action() -> ObjectiveAnalysis:
		# noinspection PyTypeChecker
		analysis: ObjectiveAnalysis = analysis_service.delete(analysis_id)
		if analysis is None:
			raise_404()
		return analysis

	return trans(analysis_service, action)
