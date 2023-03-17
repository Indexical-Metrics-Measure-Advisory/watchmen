from typing import List, Optional

from fastapi import APIRouter, Depends
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.meta import DerivedObjectiveService, ObjectiveService
from watchmen_indicator_surface.settings import ask_tuple_delete_enabled
from watchmen_indicator_surface.util import trans, trans_readonly
from watchmen_meta.admin import UserService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_model.common import DerivedObjectiveId, ObjectiveId
from watchmen_model.indicator import DerivedObjective, Objective
from watchmen_rest import get_console_principal, get_super_admin_principal, get_principal_by_jwt, \
	retrieve_authentication_manager
from watchmen_rest.util import raise_400, raise_403, raise_404
from watchmen_utilities import get_current_time_in_seconds, is_blank

router = APIRouter()


def get_derived_objective_service(principal_service: PrincipalService) -> DerivedObjectiveService:
	return DerivedObjectiveService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_objective_service(derived_objective_service: DerivedObjectiveService) -> ObjectiveService:
	return ObjectiveService(
		derived_objective_service.storage, derived_objective_service.snowflakeGenerator,
		derived_objective_service.principalService)


def get_user_service(derived_objective_service: DerivedObjectiveService) -> UserService:
	return UserService(
		derived_objective_service.storage, derived_objective_service.snowflakeGenerator,
		derived_objective_service.principalService)


@router.get(
	'/indicator/derived-objective/connect', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=DerivedObjective)
async def connect_as_derived_objective(
		objective_id: Optional[ObjectiveId], name: Optional[str],
		principal_service: PrincipalService = Depends(get_console_principal)
) -> DerivedObjective:
	if is_blank(objective_id):
		raise_400('Objective id is required.')

	derived_objective_service = get_derived_objective_service(principal_service)

	def action() -> DerivedObjective:
		objective_service = get_objective_service(derived_objective_service)
		objective: Optional[Objective] = objective_service.find_by_id(objective_id)
		if objective is None:
			raise_400('Incorrect objective id.')
		if objective.tenantId != principal_service.get_tenant_id():
			raise_403()

		derived_objective = DerivedObjective(name=name, objectiveId=objective_id, definition=objective)
		derived_objective_service.redress_storable_id(derived_objective)
		derived_objective.userId = principal_service.get_user_id()
		derived_objective.tenantId = principal_service.get_tenant_id()
		derived_objective.lastVisitTime = get_current_time_in_seconds()
		# noinspection PyTypeChecker
		derived_objective: DerivedObjective = derived_objective_service.create(derived_objective)
		return derived_objective

	return trans(derived_objective_service, action)


@router.post('/indicator/derived-objective', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=DerivedObjective)
async def save_derived_objective(
		derived_objective: DerivedObjective, principal_service: PrincipalService = Depends(get_console_principal)
) -> DerivedObjective:
	derived_objective_service = get_derived_objective_service(principal_service)

	# noinspection DuplicatedCode
	def action(a_derived_objective: DerivedObjective) -> DerivedObjective:
		a_derived_objective.userId = principal_service.get_user_id()
		a_derived_objective.tenantId = principal_service.get_tenant_id()
		a_derived_objective.lastVisitTime = get_current_time_in_seconds()
		if derived_objective_service.is_storable_id_faked(a_derived_objective.derivedObjectiveId):
			derived_objective_service.redress_storable_id(a_derived_objective)
			# noinspection PyTypeChecker
			a_derived_objective: DerivedObjective = derived_objective_service.create(a_derived_objective)
		else:
			# noinspection PyTypeChecker
			existing_derived_objective: Optional[DerivedObjective] = \
				derived_objective_service.find_by_id(a_derived_objective.derivedObjectiveId)
			if existing_derived_objective is not None:
				if existing_derived_objective.tenantId != a_derived_objective.tenantId:
					raise_403()
				if existing_derived_objective.userId != a_derived_objective.userId:
					raise_403()

			# noinspection PyTypeChecker
			a_derived_objective: DerivedObjective = derived_objective_service.update(a_derived_objective)

		return a_derived_objective

	return trans(derived_objective_service, lambda: action(derived_objective))


@router.get(
	'/indicator/derived-objective/list', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=List[DerivedObjective])
async def find_my_derived_objectives(
		principal_service: PrincipalService = Depends(get_console_principal)
) -> List[DerivedObjective]:
	derived_objective_service = get_derived_objective_service(principal_service)

	def action() -> List[DerivedObjective]:
		# noinspection PyTypeChecker
		derived_objectives: List[DerivedObjective] = derived_objective_service.find_all_by_user_id(
			principal_service.get_user_id(), principal_service.get_tenant_id())
		return derived_objectives

	return trans_readonly(derived_objective_service, action)


@router.get('/indicator/derived-objective/rename', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_class=Response)
async def update_derived_objective_name_by_id(
		derived_objective_id: Optional[DerivedObjectiveId], name: Optional[str],
		principal_service: PrincipalService = Depends(get_console_principal)
) -> None:
	if is_blank(derived_objective_id):
		raise_400('Derived objective id is required.')

	derived_objective_service = get_derived_objective_service(principal_service)

	# noinspection DuplicatedCode
	def action() -> None:
		existing_one = derived_objective_service.find_tenant_and_user(derived_objective_id)
		if existing_one is None:
			raise_404()
		existing_tenant_id, existing_user_id = existing_one
		if existing_tenant_id != principal_service.get_tenant_id():
			raise_403()
		elif existing_user_id != principal_service.get_user_id():
			raise_403()
		# noinspection PyTypeChecker
		derived_objective_service.update_name(
			derived_objective_id, name, principal_service.get_user_id(), principal_service.get_tenant_id())

	trans(derived_objective_service, action)


@router.get('/indicator/derived-objective/delete', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_class=Response)
async def delete_derived_objective_by_id(
		derived_objective_id: Optional[DerivedObjectiveId],
		principal_service: PrincipalService = Depends(get_console_principal)
) -> None:
	if is_blank(derived_objective_id):
		raise_400('Derived objective id is required.')

	derived_objective_service = get_derived_objective_service(principal_service)

	# noinspection DuplicatedCode
	def action() -> None:
		# noinspection PyTypeChecker
		existing_derived_objective: Optional[DerivedObjective] = \
			derived_objective_service.find_by_id(derived_objective_id)
		if existing_derived_objective is None:
			raise_404()
		if existing_derived_objective.tenantId != principal_service.get_tenant_id():
			raise_403()
		if not principal_service.is_tenant_admin() and existing_derived_objective.userId != principal_service.get_user_id():
			raise_403()
		derived_objective_service.delete(derived_objective_id)

	trans(derived_objective_service, action)


@router.delete('/indicator/derived-objective', tags=[UserRole.SUPER_ADMIN], response_model=DerivedObjective)
async def delete_derived_objective_by_id_by_super_admin(
		derived_objective_id: Optional[DerivedObjectiveId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> DerivedObjective:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(derived_objective_id):
		raise_400('Derived objective id is required.')

	derived_objective_service = get_derived_objective_service(principal_service)

	# noinspection DuplicatedCode
	def action() -> DerivedObjective:
		# noinspection PyTypeChecker
		existing_derived_objective: Optional[DerivedObjective] = \
			derived_objective_service.find_by_id(derived_objective_id)
		if existing_derived_objective is None:
			raise_404()
		derived_objective_service.delete(derived_objective_id)
		return existing_derived_objective

	return trans(derived_objective_service, action)


@router.get('/indicator/derived-objective/shared', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=DerivedObjective)
def load_share_derived_objective_by_id_and_token(derived_objective_id:DerivedObjectiveId,token:str)->DerivedObjective:

	principal_service: PrincipalService = get_principal_by_jwt(
		retrieve_authentication_manager(), token, [UserRole.CONSOLE, UserRole.ADMIN])

	derived_objective_service = get_derived_objective_service(principal_service)
	def action() -> DerivedObjective:
		# noinspection PyTypeChecker
		existing_derived_objective: Optional[DerivedObjective] = \
			derived_objective_service.find_by_id(derived_objective_id)
		if existing_derived_objective is None:
			raise_404()
		return existing_derived_objective

	return trans_readonly(derived_objective_service, action)