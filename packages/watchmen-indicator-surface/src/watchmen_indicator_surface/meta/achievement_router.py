from typing import Callable, List, Optional

from fastapi import APIRouter, Body, Depends

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.meta import AchievementService
from watchmen_indicator_surface.settings import ask_tuple_delete_enabled
from watchmen_indicator_surface.util import trans, trans_readonly
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_model.common import AchievementId, DataPage, Pageable, TenantId, UserId
from watchmen_model.indicator import Achievement
from watchmen_rest import get_console_principal, get_super_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404
from watchmen_utilities import is_blank

router = APIRouter()


def get_achievement_service(principal_service: PrincipalService) -> AchievementService:
	return AchievementService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get('/indicator/achievement', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=Achievement)
async def load_achievement_by_id(
		achievement_id: Optional[AchievementId], principal_service: PrincipalService = Depends(get_console_principal)
) -> Achievement:
	if is_blank(achievement_id):
		raise_400('Achievement id is required.')

	achievement_service = get_achievement_service(principal_service)

	# noinspection DuplicatedCode
	def action() -> Achievement:
		# noinspection PyTypeChecker
		achievement: Achievement = achievement_service.find_by_id(achievement_id)
		if achievement is None:
			raise_404()
		# user id must match current principal's
		if achievement.userId != principal_service.get_user_id():
			raise_404()
		# tenant id must match current principal's
		if achievement.tenantId != principal_service.get_tenant_id():
			raise_404()
		return achievement

	return trans_readonly(achievement_service, action)


# noinspection DuplicatedCode
def ask_save_achievement_action(
		achievement_service: AchievementService, principal_service: PrincipalService
) -> Callable[[Achievement], Achievement]:
	# noinspection DuplicatedCode
	def action(achievement: Achievement) -> Achievement:
		achievement.userId = principal_service.get_user_id()
		achievement.tenantId = principal_service.get_tenant_id()
		if achievement_service.is_storable_id_faked(achievement.achievementId):
			achievement_service.redress_storable_id(achievement)
			# noinspection PyTypeChecker
			achievement: Achievement = achievement_service.create(achievement)
		else:
			existing_inspection: Optional[Achievement] = achievement_service.find_by_id(achievement.achievementId)
			if existing_inspection is not None:
				if existing_inspection.tenantId != achievement.tenantId:
					raise_403()
				if existing_inspection.userId != achievement.userId:
					raise_403()

			# noinspection PyTypeChecker
			achievement: Achievement = achievement_service.update(achievement)
		return achievement

	return action


@router.post('/indicator/achievement', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=Achievement)
async def save_achievement(
		achievement: Achievement, principal_service: PrincipalService = Depends(get_console_principal)
) -> Achievement:
	achievement_service = get_achievement_service(principal_service)
	action = ask_save_achievement_action(achievement_service, principal_service)
	return trans(achievement_service, lambda: action(achievement))


class QueryAchievementDataPage(DataPage):
	data: List[Achievement]


@router.post(
	'/indicator/achievement/name', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=QueryAchievementDataPage)
async def find_my_achievements_by_name(
		query_name: Optional[str], pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_console_principal)
) -> QueryAchievementDataPage:
	achievement_service = get_achievement_service(principal_service)

	def action() -> QueryAchievementDataPage:
		user_id: UserId = principal_service.get_user_id()
		tenant_id: TenantId = principal_service.get_tenant_id()
		if is_blank(query_name):
			# noinspection PyTypeChecker
			return achievement_service.find_page_by_text(None, user_id, tenant_id, pageable)
		else:
			# noinspection PyTypeChecker
			return achievement_service.find_page_by_text(query_name, user_id, tenant_id, pageable)

	return trans_readonly(achievement_service, action)


@router.delete('/indicator/achievement', tags=[UserRole.SUPER_ADMIN], response_model=Achievement)
async def delete_achievement_by_id_by_super_admin(
		achievement_id: Optional[AchievementId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> Achievement:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(achievement_id):
		raise_400('Achievement id is required.')

	achievement_service = get_achievement_service(principal_service)

	def action() -> Achievement:
		# noinspection PyTypeChecker
		achievement: Achievement = achievement_service.delete(achievement_id)
		if achievement is None:
			raise_404()
		return achievement

	return trans(achievement_service, action)
