from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.common import IndicatorKernelException
from watchmen_indicator_kernel.meta import DerivedObjectiveService
from watchmen_model.common import DerivedObjectiveId
from watchmen_model.indicator import DerivedObjective


def get_derived_objective_service(principal_service: PrincipalService) -> DerivedObjectiveService:
	return DerivedObjectiveService(principal_service)


def ask_derived_objective(derived_objective_id: DerivedObjectiveId,principal_service: PrincipalService):
	derived_objective:DerivedObjective= get_derived_objective_service(principal_service).find_by_id(derived_objective_id)
	if derived_objective is None:
		raise IndicatorKernelException(f'derived_objective[id={derived_objective_id}] not found.')
	if derived_objective_id.tenantId != principal_service.get_tenant_id():
		raise IndicatorKernelException(f'derived_objective[id={derived_objective_id}] not found.')
	return derived_objective