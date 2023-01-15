from watchmen_auth import PrincipalService
from watchmen_model.indicator import Objective
from .data_service import ObjectiveDataService


def get_objective_data_service(objective: Objective, principal_service: PrincipalService) -> ObjectiveDataService:
	return ObjectiveDataService(objective,  principal_service)