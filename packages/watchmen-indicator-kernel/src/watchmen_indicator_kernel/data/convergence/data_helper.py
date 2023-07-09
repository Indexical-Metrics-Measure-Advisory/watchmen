from watchmen_auth import PrincipalService
from watchmen_model.indicator import Convergence
from .data_service import ConvergenceDataService


def get_convergence_data_service(
		convergence: Convergence, principal_service: PrincipalService) -> ConvergenceDataService:
	return ConvergenceDataService(convergence, principal_service)
