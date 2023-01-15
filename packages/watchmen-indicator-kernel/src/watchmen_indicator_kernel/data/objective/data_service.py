from decimal import Decimal
from typing import Dict, List, Optional

from pydantic import BaseModel

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.data.objective_factor import get_objective_factor_data_service
from watchmen_indicator_kernel.data.utils import as_time_frame, compute_time_frame, TimeFrame
from watchmen_model.common import ObjectiveFactorId, ObjectiveTargetId
from watchmen_model.indicator import Objective, ObjectiveFactor, ObjectiveFactorOnIndicator, ObjectiveTarget
from watchmen_utilities import ArrayHelper


class ObjectiveTargetValues(BaseModel):
	uuid: ObjectiveTargetId = None
	currentValue: Optional[Decimal] = None
	previousValue: Optional[Decimal] = None
	chainValue: Optional[Decimal] = None
	failed: bool = False


class TempObjectiveFactorValues(BaseModel):
	uuid: ObjectiveFactorId = None
	currentValue: Optional[Decimal] = None
	previousValue: Optional[Decimal] = None
	chainValue: Optional[Decimal] = None
	failed: bool = False
	previousAsked: bool = False
	chainAsked: bool = False


class ObjectiveFactorValues(BaseModel):
	uuid: ObjectiveFactorId = None
	currentValue: Optional[Decimal] = None
	previousValue: Optional[Decimal] = None
	chainValue: Optional[Decimal] = None
	failed: bool = False


class ObjectiveValues(BaseModel):
	targets: List[ObjectiveTargetValues]
	factors: List[ObjectiveFactorValues]


class ObjectiveDataService:
	def __init__(self, objective: Objective, principal_service: PrincipalService):
		self.principalService = principal_service
		self.objective = objective
		self.current_time_frame = self.compute_current_time_frame()

	def get_principal_service(self) -> PrincipalService:
		return self.principalService

	def get_objective(self) -> Objective:
		return self.objective

	def get_current_time_frame(self) -> Optional[TimeFrame]:
		return self.current_time_frame

	def compute_current_time_frame(self) -> Optional[TimeFrame]:
		time_frame = self.get_objective().timeFrame
		if time_frame is None:
			return None
		else:
			return as_time_frame(compute_time_frame(time_frame))

	# def compute_value(self, value: Optional[Decimal]) -> Optional[Decimal]:
	# 	if value is None:
	# 		return value
	#
	# 	objective_factor = self.get_objective_factor()
	# 	formula = objective_factor.formula
	# 	if formula is None or formula.operator == ObjectiveFormulaOperator.NONE:
	# 		return value
	def ask_indicator_factor_value_on_current_time_frame(
			self, factor: ObjectiveFactorOnIndicator, values: TempObjectiveFactorValues):
		try:
			objective_factor_data_service = get_objective_factor_data_service(
				self.get_objective(), factor, self.get_principal_service())
			values.currentValue = objective_factor_data_service.ask_value(self.get_current_time_frame())
		except:
			values.failed = True

	def compute_factor_value_on_current_time_frame(self, factor: ObjectiveFactor, values: TempObjectiveFactorValues):
		# TODO
		pass

	def compute_target_value(
			self, target: ObjectiveTarget, factor_values: Dict[ObjectiveFactorId, TempObjectiveFactorValues]
	) -> ObjectiveTargetValues:
		values = ObjectiveTargetValues(uuid=target.uuid)
		# TODO
		return values

	def ask_values(self) -> ObjectiveValues:
		# get factors
		factors = self.get_objective().factors
		# initialize factor values
		factor_values: Dict[ObjectiveFactorId, TempObjectiveFactorValues] = ArrayHelper(factors) \
			.map(lambda x: TempObjectiveFactorValues(uuid=x.uuid)) \
			.to_map(lambda x: x.uuid, lambda x: x)
		# ask indicator factor value on current time frame
		ArrayHelper(factors) \
			.filter(lambda x: isinstance(x, ObjectiveFactorOnIndicator)) \
			.each(lambda x: self.ask_indicator_factor_value_on_current_time_frame(x, factor_values[x.uuid]))
		# compute factor value with formula
		# TODO sort by formula dependency
		ArrayHelper(factors) \
			.each(lambda x: self.compute_factor_value_on_current_time_frame(x, factor_values[x.uuid]))

		# compute target values
		targets = self.get_objective().targets
		target_values = ArrayHelper(targets) \
			.map(lambda x: self.compute_target_value(x, factor_values)) \
			.to_list()

		def formalize_factor_values(values: TempObjectiveFactorValues) -> ObjectiveFactorValues:
			return ObjectiveFactorValues(
				uuid=values.uuid,
				currentValue=values.currentValue, previousValue=values.previousValue, chainValue=values.chainValue,
				failed=values.failed
			)

		return ObjectiveValues(
			factors=ArrayHelper(list(factor_values.values())).map(formalize_factor_values).to_list(),
			targets=target_values)
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
