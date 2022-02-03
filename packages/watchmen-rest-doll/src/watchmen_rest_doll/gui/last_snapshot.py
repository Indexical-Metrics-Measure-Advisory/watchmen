from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_meta_service.gui import LastSnapshotService
from watchmen_model.admin import UserRole
from watchmen_model.gui import LastSnapshot
from watchmen_rest.util import raise_500
from watchmen_rest_doll.auth import get_any_principal
from watchmen_rest_doll.doll import ask_meta_storage
from watchmen_utilities import get_current_time_seconds

router = APIRouter()


def get_last_snapshot_service(principal_service: PrincipalService) -> LastSnapshotService:
	return LastSnapshotService(ask_meta_storage(), principal_service)


@router.get(
	'/last_snapshot/me', tags=[UserRole.CONSOLE, UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=LastSnapshot)
async def load_my_last_snapshot(principal_service: PrincipalService = Depends(get_any_principal)):
	last_snapshot_service = get_last_snapshot_service(principal_service)
	last_snapshot_service.begin_transaction()
	try:
		last_snapshot = last_snapshot_service.find_by_id(
			principal_service.get_user_id(), principal_service.get_tenant_id())
		if last_snapshot is None:
			last_snapshot = LastSnapshot(
				connectedSpaceIds=[],
				dashboardIds=[],
				tenantId=principal_service.get_tenant_id(),
				userId=principal_service.get_user_id(),
			)
		return last_snapshot
	finally:
		last_snapshot_service.close_transaction()


@router.post(
	'/last_snapshots/save', tags=[UserRole.CONSOLE, UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=LastSnapshot)
async def save_last_snapshot_with_user(
		last_snapshot: LastSnapshot, principal_service: PrincipalService = Depends(get_any_principal)):
	last_snapshot.userId = principal_service.get_user_id()
	last_snapshot.tenantId = principal_service.get_tenant_id()
	last_snapshot.lastVisitTime = get_current_time_seconds()
	if last_snapshot.connectedSpaceIds is None:
		last_snapshot.connectedSpaceIds = []
	if last_snapshot.dashboardIds is None:
		last_snapshot.dashboardIds = []

	last_snapshot_service = get_last_snapshot_service(principal_service)
	last_snapshot_service.begin_transaction()
	try:
		existing_last_snapshot = last_snapshot_service.find_by_id(
			principal_service.get_user_id(), principal_service.get_tenant_id())
		if existing_last_snapshot is None:
			last_snapshot_service.create(last_snapshot)
		else:
			last_snapshot_service.update(last_snapshot)

		last_snapshot_service.commit_transaction()
		return last_snapshot
	except Exception as e:
		last_snapshot_service.rollback_transaction()
		raise_500(e)
