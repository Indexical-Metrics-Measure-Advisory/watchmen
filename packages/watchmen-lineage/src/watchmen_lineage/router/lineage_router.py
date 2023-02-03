from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_lineage.model.lineage import LineageResult
from watchmen_lineage.service.lineage_service import LineageService
from watchmen_model.admin import UserRole
from watchmen_model.common import ObjectiveTargetId, ObjectiveId
from watchmen_rest import get_admin_principal

router = APIRouter()

lineage_service = LineageService()


@router.post('/linegae/rebuild', tags=[UserRole.ADMIN])
def rebuild_lineage_by_tenant(principal_service: PrincipalService = Depends(get_admin_principal)):
	lineage_service.init_tenant_all_lineage_data(principal_service)


# find lineage by objective target

@router.get("/indicator/objective/target/consanguinity", tags=[UserRole.ADMIN], response_model=LineageResult)
def find_lineage_by_objective_target(target_id: ObjectiveTargetId, objective_id: ObjectiveId,
                                     principal_service: PrincipalService = Depends(get_admin_principal)):
	lineage_service.init_tenant_all_lineage_data(principal_service)
	return lineage_service.find_lineage_by_objective_target(target_id, objective_id, principal_service)


@router.get("/indicator/objective/consanguinity", tags=[UserRole.ADMIN], response_model=LineageResult)
def find_lineage_by_objective(objective_id: ObjectiveId,
                              principal_service: PrincipalService = Depends(get_admin_principal)):
	lineage_service.init_tenant_all_lineage_data(principal_service)
	return lineage_service.find_lineage_by_objective(objective_id, principal_service)
