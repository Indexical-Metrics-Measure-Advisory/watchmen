from typing import Dict, List, Optional

from fastapi import APIRouter, Body, Depends

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.meta import ObjectiveService
from watchmen_indicator_surface.settings import ask_tuple_delete_enabled
from watchmen_indicator_surface.util import trans, trans_readonly
from watchmen_meta.admin import UserService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import User, UserRole
from watchmen_model.common import DataPage, ObjectiveId, Pageable, TenantId, UserGroupId
from watchmen_model.indicator import Objective
from watchmen_rest import get_admin_principal, get_console_principal, get_super_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404, validate_tenant_id
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank

router = APIRouter()


def get_objective_service(principal_service: PrincipalService) -> ObjectiveService:
	return ObjectiveService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_user_service(objective_service: ObjectiveService) -> UserService:
	return UserService(
		objective_service.storage, objective_service.snowflakeGenerator, objective_service.principalService)


@router.get('/indicator/objective/name', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=List[Objective])
async def find_objectives_by_name(
		query_name: Optional[str], principal_service: PrincipalService = Depends(get_console_principal)
) -> List[Objective]:
	objective_service = get_objective_service(principal_service)

	def action() -> List[Objective]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		objectives: List[Objective]
		if is_blank(query_name):
			# noinspection PyTypeChecker
			objectives = objective_service.find_by_text(None, tenant_id)
		else:
			# noinspection PyTypeChecker
			objectives = objective_service.find_by_text(query_name, tenant_id)

		if principal_service.is_admin():
			# current is admin, returns all
			return objectives
		else:
			# current is not admin, only granted will be returned
			# noinspection PyTypeChecker
			user: User = get_user_service(objective_service).find_by_id(principal_service.get_user_id())
			group_id_map: Dict[UserGroupId, bool]
			if user.groupIds is not None:
				group_id_map = ArrayHelper(user.groupIds).filter(is_not_blank).to_map(lambda x: x, lambda x: True)
			else:
				group_id_map = {}

			def can_access(objective: Objective) -> bool:
				user_group_ids = objective.groupIds
				if user_group_ids is None or len(user_group_ids) == 0:
					return False
				else:
					return ArrayHelper(user_group_ids).some(lambda x: group_id_map[x] is not None)

			return ArrayHelper(objectives).filter(can_access).to_list()

	return trans_readonly(objective_service, action)


class QueryObjectiveDataPage(DataPage):
	data: List[Objective]


@router.post('/indicator/objective/name', tags=[UserRole.ADMIN], response_model=QueryObjectiveDataPage)
async def find_objectives_page_by_name(
		query_name: Optional[str], pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_admin_principal)) -> QueryObjectiveDataPage:
	objective_service = get_objective_service(principal_service)

	def action() -> QueryObjectiveDataPage:
		tenant_id: TenantId = principal_service.get_tenant_id()
		if is_blank(query_name):
			# noinspection PyTypeChecker
			return objective_service.find_page_by_text(None, tenant_id, pageable)
		else:
			# noinspection PyTypeChecker
			return objective_service.find_page_by_text(query_name, tenant_id, pageable)

	return trans_readonly(objective_service, action)


@router.get('/indicator/objective', tags=[UserRole.ADMIN], response_model=Objective)
async def load_objective_by_id(
		objective_id: Optional[ObjectiveId], principal_service: PrincipalService = Depends(get_admin_principal)
) -> Objective:
	if is_blank(objective_id):
		raise_400('Objective id is required.')

	objective_service = get_objective_service(principal_service)

	def action() -> Objective:
		# noinspection PyTypeChecker
		objective: Objective = objective_service.find_by_id(objective_id)
		if objective is None:
			raise_404()
		# tenant id must match current principal's
		if objective.tenantId != principal_service.get_tenant_id():
			raise_404()

		return objective

	return trans_readonly(objective_service, action)


@router.post('/indicator/objective', tags=[UserRole.ADMIN], response_model=Objective)
async def save_objective(
		objective: Objective, principal_service: PrincipalService = Depends(get_admin_principal)) -> Objective:
	validate_tenant_id(objective, principal_service)
	objective_service = get_objective_service(principal_service)

	# noinspection DuplicatedCode
	def action(an_objective: Objective) -> Objective:
		if objective_service.is_storable_id_faked(an_objective.objectiveId):
			objective_service.redress_storable_id(an_objective)
			# noinspection PyTypeChecker
			an_objective: Objective = objective_service.create(an_objective)
		else:
			# noinspection PyTypeChecker
			existing_objective: Optional[Objective] = objective_service.find_by_id(an_objective.objectiveId)
			if existing_objective is not None:
				if existing_objective.tenantId != an_objective.tenantId:
					raise_403()

			# noinspection PyTypeChecker
			an_objective: Objective = objective_service.update(an_objective)

		return an_objective

	return trans(objective_service, lambda: action(objective))


@router.delete('/indicator/objective', tags=[UserRole.SUPER_ADMIN], response_model=Objective)
async def delete_objective_by_id_by_super_admin(
		objective_id: Optional[ObjectiveId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> Objective:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(objective_id):
		raise_400('Objective id is required.')

	objective_service = get_objective_service(principal_service)

	def action() -> Objective:
		# noinspection PyTypeChecker
		objective: Objective = objective_service.delete(objective_id)
		if objective is None:
			raise_404()
		return objective

	return trans(objective_service, action)
