from decimal import Decimal
from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_model.indicator import Objective, ObjectiveFormulaOperator


class ObjectiveDataService:
	def __init__(self, objective: Objective, principal_service: PrincipalService):
		self.principalService = principal_service
		self.objective = objective

	def get_principal_service(self) -> PrincipalService:
		return self.principalService

	def get_objective(self) -> Objective:
		return self.objective

	def compute_value(self, value: Optional[Decimal]) -> Optional[Decimal]:
		if value is None:
			return value

		objective_factor = self.get_objective_factor()
		formula = objective_factor.formula
		if formula is None or formula.operator == ObjectiveFormulaOperator.NONE:
			return value

# formula_operator = formula.operator
# if formula_operator == ObjectiveFormulaOperator.ADD:
# elif formula_operator == ObjectiveFormulaOperator.SUBTRACT:
# elif formula_operator == ObjectiveFormulaOperator.MULTIPLY:
# elif formula_operator == ObjectiveFormulaOperator.DIVIDE:
# elif formula_operator == ObjectiveFormulaOperator.ROUND:
# elif formula_operator == ObjectiveFormulaOperator.FLOOR:
# elif formula_operator == ObjectiveFormulaOperator.CEIL:
# elif formula_operator == ObjectiveFormulaOperator.ABS:
# elif formula_operator == ObjectiveFormulaOperator.MAX:
# elif formula_operator == ObjectiveFormulaOperator.MIN:
# elif formula_operator == ObjectiveFormulaOperator.INTERPOLATE:
# elif formula_operator == ObjectiveFormulaOperator.CASE_THEN:
# else:
# 	raise IndicatorKernelException(f'Objective factor formula[operator={formula_operator}] is not supported.')
