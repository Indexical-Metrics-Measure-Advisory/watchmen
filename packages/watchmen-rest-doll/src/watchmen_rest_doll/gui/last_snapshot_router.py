from logging import getLogger
from typing import Optional

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage
from watchmen_meta.gui import LastSnapshotService
from watchmen_model.admin import UserRole
from watchmen_model.common import TenantId, UserId
from watchmen_model.gui import LastSnapshot
from watchmen_rest import get_any_principal, get_super_admin_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_rest_doll.doll import ask_tuple_delete_enabled
from watchmen_rest_doll.util import trans, trans_with_fail_over
from watchmen_utilities import get_current_time_in_seconds, is_blank

router = APIRouter()
logger = getLogger(__name__)


def get_last_snapshot_service(principal_service: PrincipalService) -> LastSnapshotService:
	return LastSnapshotService(ask_meta_storage(), principal_service)


def build_empty_last_snapshot(tenant_id: TenantId, user_id: UserId):
	return LastSnapshot(
		language=None,
		lastDashboardId=None,
		adminDashboardId=None,
		favoritePin=False,
		tenantId=tenant_id,
		userId=user_id
	)


@router.get(
	'/last_snapshot', tags=[UserRole.CONSOLE, UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=LastSnapshot)
async def load_my_last_snapshot(principal_service: PrincipalService = Depends(get_any_principal)) -> LastSnapshot:
	last_snapshot_service = get_last_snapshot_service(principal_service)

	def action() -> LastSnapshot:
		last_snapshot = last_snapshot_service.find_by_user_id(
			principal_service.get_user_id(), principal_service.get_tenant_id())
		if last_snapshot is None:
			last_snapshot = build_empty_last_snapshot(
				principal_service.get_tenant_id(), principal_service.get_user_id())
		else:
			last_snapshot.lastVisitTime = get_current_time_in_seconds()
			last_snapshot_service.update(last_snapshot)
		return last_snapshot

	def fail_over() -> LastSnapshot:
		return build_empty_last_snapshot(principal_service.get_tenant_id(), principal_service.get_user_id())

	return trans_with_fail_over(last_snapshot_service, action, fail_over)


@router.post(
	'/last_snapshot', tags=[UserRole.CONSOLE, UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=LastSnapshot)
async def save_my_last_snapshot(
		last_snapshot: LastSnapshot, principal_service: PrincipalService = Depends(get_any_principal)
) -> LastSnapshot:
	last_snapshot_service = get_last_snapshot_service(principal_service)

	def action() -> LastSnapshot:
		last_snapshot.userId = principal_service.get_user_id()
		last_snapshot.tenantId = principal_service.get_tenant_id()
		last_snapshot.lastVisitTime = get_current_time_in_seconds()
		if last_snapshot.favoritePin is None:
			last_snapshot.favoritePin = False
		existing_last_snapshot = last_snapshot_service.find_by_user_id(
			principal_service.get_user_id(), principal_service.get_tenant_id())
		if existing_last_snapshot is None:
			last_snapshot_service.create(last_snapshot)
		else:
			last_snapshot_service.update(last_snapshot)
		return last_snapshot

	return trans(last_snapshot_service, action)


@router.delete('/last_snapshot', tags=[UserRole.SUPER_ADMIN], response_model=LastSnapshot)
async def delete_last_snapshot_by_id(
		user_id: Optional[UserId],
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> LastSnapshot:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(user_id):
		raise_400('User id is required.')

	last_snapshot_service = get_last_snapshot_service(principal_service)

	def action() -> LastSnapshot:
		# noinspection PyTypeChecker
		last_snapshot: LastSnapshot = last_snapshot_service.delete_by_id(user_id)
		if last_snapshot is None:
			raise_404()
		return last_snapshot

	return trans(last_snapshot_service, action)
