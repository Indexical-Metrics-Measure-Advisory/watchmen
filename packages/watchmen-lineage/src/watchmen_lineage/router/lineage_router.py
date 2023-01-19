from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_lineage.model.lineage import LineageResult
from watchmen_model.admin import UserRole
from watchmen_model.common import TenantId, ObjectiveTargetId, ObjectiveId
from watchmen_rest import get_admin_principal

router = APIRouter()


@router.post('/linegae/rebuild', tags=[UserRole.ADMIN])
def rebuild_lineage_by_tenant(tenant_id: TenantId, principal_service: PrincipalService = Depends(get_admin_principal)):
	pass


# find lineage by objective target

@router.get("/linegae/objective_target", tags=[UserRole.ADMIN], response_model=LineageResult)
def find_lineage_by_objective_target(objective_target_id: ObjectiveTargetId, objective_id: ObjectiveId,
                                     principal_service: PrincipalService = Depends(get_admin_principal)):
	pass





