from typing import Dict, List, Optional

from fastapi import APIRouter, Body, Depends

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.meta import ObjectiveService
from watchmen_indicator_surface.settings import ask_tuple_delete_enabled
from watchmen_indicator_surface.util import trans, trans_readonly
from watchmen_meta.admin import UserGroupService, UserService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import User, UserGroup, UserRole
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


def get_user_group_service(objective_service: ObjectiveService) -> UserGroupService:
	return UserGroupService(
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


@router.get('/indicator/objective/list/name', tags=[UserRole.ADMIN], response_model=List[Objective])
async def find_objectives_by_name(
		query_name: Optional[str], principal_service: PrincipalService = Depends(get_console_principal)
) -> List[Objective]:
	objective_service = get_objective_service(principal_service)

	def action() -> List[Objective]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		if is_blank(query_name):
			# noinspection PyTypeChecker
			return objective_service.find_by_name(None, tenant_id)
		else:
			# noinspection PyTypeChecker
			return objective_service.find_by_name(query_name, tenant_id)

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


@router.post('/indicator/objective/ids', tags=[UserRole.ADMIN], response_model=List[Objective])
async def find_objectives_by_ids(
		objective_ids: List[ObjectiveId], principal_service: PrincipalService = Depends(get_console_principal)
) -> List[Objective]:
	if len(objective_ids) == 0:
		return []

	objective_service = get_objective_service(principal_service)

	def action() -> List[Objective]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		return objective_service.find_by_ids(objective_ids, tenant_id)

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


# noinspection DuplicatedCode
def has_objective_id(user_group: UserGroup, objective_id: ObjectiveId) -> bool:
	if user_group.objectiveIds is None:
		return False
	elif len(user_group.objectiveIds) == 0:
		return False
	else:
		return objective_id in user_group.objectiveIds


def append_objective_id_to_user_group(user_group: UserGroup, objective_id: ObjectiveId) -> UserGroup:
	if user_group.objectiveIds is None:
		user_group.objectiveIds = [objective_id]
	else:
		user_group.objectiveIds.append(objective_id)
	return user_group


def update_user_group(user_group_service: UserGroupService, user_group: UserGroup) -> None:
	user_group_service.update(user_group)


# noinspection DuplicatedCode
def sync_objective_to_groups(
		objective_service: ObjectiveService,
		objective_id: ObjectiveId, user_group_ids: List[UserGroupId],
		tenant_id: TenantId
) -> None:
	if user_group_ids is None:
		return

	given_count = len(user_group_ids)
	if given_count == 0:
		# do nothing
		return

	user_group_service = get_user_group_service(objective_service)
	user_groups = user_group_service.find_by_ids(user_group_ids, tenant_id)
	found_count = len(user_groups)
	if given_count != found_count:
		raise_400('User group ids do not match.')

	ArrayHelper(user_groups) \
		.filter(lambda x: not has_objective_id(x, objective_id)) \
		.map(lambda x: append_objective_id_to_user_group(x, objective_id)) \
		.each(lambda x: update_user_group(user_group_service, x))


def remove_objective_id_from_user_group(user_group: UserGroup, objective_id: ObjectiveId) -> UserGroup:
	user_group.objectiveIds = ArrayHelper(user_group.objectiveIds).filter(lambda x: x != objective_id).to_list()
	return user_group


# noinspection DuplicatedCode
def remove_objective_from_groups(
		objective_service: ObjectiveService,
		objective_id: ObjectiveId, user_group_ids: List[UserGroupId],
		tenant_id: TenantId
) -> None:
	if user_group_ids is None:
		return

	given_count = len(user_group_ids)
	if given_count == 0:
		# do nothing
		return

	user_group_service = get_user_group_service(objective_service)
	user_groups = user_group_service.find_by_ids(user_group_ids, tenant_id)
	found_count = len(user_groups)
	if given_count != found_count:
		raise_400('User group ids do not match.')

	ArrayHelper(user_groups) \
		.filter(lambda x: has_objective_id(x, objective_id)) \
		.map(lambda x: remove_objective_id_from_user_group(x, objective_id)) \
		.each(lambda x: update_user_group(user_group_service, x))


@router.post('/indicator/objective', tags=[UserRole.ADMIN], response_model=Objective)
async def save_objective(
		objective: Objective, principal_service: PrincipalService = Depends(get_admin_principal)) -> Objective:
	validate_tenant_id(objective, principal_service)
	objective_service = get_objective_service(principal_service)

	# noinspection DuplicatedCode
	def action(an_objective: Objective) -> Objective:
		if objective_service.is_storable_id_faked(an_objective.objectiveId):
			objective_service.redress_storable_id(an_objective)
			user_group_ids = ArrayHelper(an_objective.groupIds).distinct().to_list()
			an_objective.groupIds = user_group_ids
			# noinspection PyTypeChecker
			an_objective: Objective = objective_service.create(an_objective)
			# synchronize objective to user groups
			sync_objective_to_groups(objective_service, objective.objectiveId, user_group_ids, objective.tenantId)
		else:
			# noinspection PyTypeChecker
			existing_objective: Optional[Objective] = objective_service.find_by_id(an_objective.objectiveId)
			if existing_objective is not None:
				if existing_objective.tenantId != an_objective.tenantId:
					raise_403()

			user_group_ids = ArrayHelper(an_objective.groupIds).distinct().to_list()
			an_objective.groupIds = user_group_ids
			# noinspection PyTypeChecker
			an_objective: Objective = objective_service.update(an_objective)
			# remove objective from user groups, in case user groups are removed
			removed_user_group_ids = ArrayHelper(existing_objective.groupIds).difference(user_group_ids).to_list()
			remove_objective_from_groups(
				objective_service, an_objective.objectiveId, removed_user_group_ids, an_objective.tenantId)
			# synchronize objective to user groups
			sync_objective_to_groups(objective_service, an_objective.objectiveId, user_group_ids, an_objective.tenantId)

		return an_objective

	return trans(objective_service, lambda: action(objective))


@router.get('/indicator/objective/available', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=List[Objective])
async def find_available_objectives(
		principal_service: PrincipalService = Depends(get_console_principal)) -> List[Objective]:
	objective_service = get_objective_service(principal_service)

	# noinspection DuplicatedCode
	def action() -> List[Objective]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		user_id = principal_service.get_user_id()
		# noinspection PyTypeChecker
		user: User = get_user_service(objective_service).find_by_id(user_id)
		user_group_ids = user.groupIds
		if user_group_ids is None or len(user_group_ids) == 0:
			return []
		user_group_ids = ArrayHelper(user_group_ids).filter(lambda x: is_not_blank(x)).to_list()
		if len(user_group_ids) == 0:
			return []
		user_group_service = get_user_group_service(objective_service)
		user_groups = user_group_service.find_by_ids(user_group_ids, tenant_id)

		def gather_objective_ids(distinct_objective_ids: List[ObjectiveId], user_group: UserGroup) -> List[ObjectiveId]:
			given_objective_ids = user_group.objectiveIds
			if given_objective_ids is None or len(given_objective_ids) == 0:
				return distinct_objective_ids
			given_objective_ids = ArrayHelper(given_objective_ids).filter(lambda x: is_not_blank(x)).to_list()
			for objective_id in given_objective_ids:
				if objective_id not in distinct_objective_ids:
					distinct_objective_ids.append(objective_id)
			return distinct_objective_ids

		objective_ids = ArrayHelper(user_groups).reduce(gather_objective_ids, [])
		return objective_service.find_by_ids(objective_ids, tenant_id)

	return trans_readonly(objective_service, action)


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
