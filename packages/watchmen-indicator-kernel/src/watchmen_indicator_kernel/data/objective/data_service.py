from datetime import date
from decimal import Decimal
from logging import getLogger
from typing import Any, Callable, Dict, List, Optional, Tuple

from math import ceil, floor
from pydantic import BaseModel

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common import ask_all_date_formats
from watchmen_data_kernel.storage_bridge import parse_parameter_in_memory, PipelineVariables
from watchmen_model.common import ConstantParameter, ObjectiveFactorId, ObjectiveTargetId, ParameterKind
from watchmen_model.indicator import ComputedObjectiveParameter, ConstantObjectiveParameter, Objective, \
	ObjectiveFactor, ObjectiveFactorOnComputation, ObjectiveFactorOnIndicator, ObjectiveFormulaOperator, \
	ObjectiveParameter, ObjectiveParameterCondition, ObjectiveParameterExpression, \
	ObjectiveParameterExpressionOperator, ObjectiveParameterJoint, ObjectiveParameterJointType, ObjectiveTarget, \
	ObjectiveVariableKind, ObjectiveVariableOnValue, ReferObjectiveParameter
from watchmen_utilities import ArrayHelper, get_day_of_month, get_day_of_week, get_half_year, get_month, get_quarter, \
	get_week_of_month, get_week_of_year, get_year, is_blank, is_date, is_decimal, is_not_blank
from ..objective_factor import get_objective_factor_data_service
from ..utils import as_time_frame, compute_chain_frame, compute_previous_frame, compute_time_frame, TimeFrame

logger = getLogger(__name__)


class ObjectiveTargetValues(BaseModel):
	uuid: ObjectiveTargetId
	target: ObjectiveTarget
	currentValue: Optional[Decimal] = None
	previousValue: Optional[Decimal] = None
	chainValue: Optional[Decimal] = None
	failed: bool = False


class TempObjectiveFactorValues(BaseModel):
	uuid: ObjectiveFactorId
	factor: ObjectiveFactor
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


class SortableObjectiveFactor(BaseModel):
	factor: ObjectiveFactor
	depends: List[ObjectiveFactorId]
	allDepends: List[ObjectiveFactorId]
	invalid: bool


class ObjectiveDataService:
	def __init__(self, objective: Objective, principal_service: PrincipalService):
		self.principalService = principal_service
		self.objective = objective
		# compute time frame
		time_frame = objective.timeFrame
		if time_frame is None:
			self.currentTimeFrame = None
			self.previousTimeFrame = None
			self.chainTimeFrame = None
		else:
			time_frame_tuple = compute_time_frame(time_frame)
			self.currentTimeFrame = as_time_frame(time_frame_tuple)
			self.previousTimeFrame = as_time_frame(compute_previous_frame(time_frame, time_frame_tuple))
			self.chainTimeFrame = as_time_frame(compute_chain_frame(time_frame, time_frame_tuple))
		# gather variables which can be used in formula
		self.variablesOnValueMap: Dict[str, str] = {}
		single_value_variables: List[ObjectiveVariableOnValue] = ArrayHelper(objective.variables) \
			.filter(lambda x: x.kind == ObjectiveVariableKind.SINGLE_VALUE) \
			.filter(lambda x: is_not_blank(x.name)) \
			.to_list()
		for var in single_value_variables:
			self.variablesOnValueMap[var.name.strip()] = var.value

	def get_principal_service(self) -> PrincipalService:
		return self.principalService

	def get_objective(self) -> Objective:
		return self.objective

	def get_current_time_frame(self) -> Optional[TimeFrame]:
		return self.currentTimeFrame

	def get_previous_time_frame(self) -> Optional[TimeFrame]:
		return self.previousTimeFrame

	def get_chain_time_frame(self) -> Optional[TimeFrame]:
		return self.chainTimeFrame

	# noinspection PyMethodMayBeStatic
	def set_value_to_current(self, values: TempObjectiveFactorValues, value: Optional[Decimal]):
		values.currentValue = value

	# noinspection PyMethodMayBeStatic
	def set_value_to_previous(self, values: TempObjectiveFactorValues, value: Optional[Decimal]):
		values.previousValue = value
		values.previousAsked = True

	# noinspection PyMethodMayBeStatic
	def set_value_to_chain(self, values: TempObjectiveFactorValues, value: Optional[Decimal]):
		values.chainValue = value
		values.chainAsked = True

	def ask_indicator_factor_value(
			self, factor: ObjectiveFactorOnIndicator, values: TempObjectiveFactorValues,
			get_time_frame: Callable[[], Optional[TimeFrame]],
			set_to: Callable[[TempObjectiveFactorValues, Optional[Decimal]], None]):
		# noinspection PyBroadException
		try:
			objective_factor_data_service = get_objective_factor_data_service(
				self.get_objective(), factor, self.get_principal_service())
			value = objective_factor_data_service.ask_value(get_time_frame())
			set_to(values, value)
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			values.failed = True

	def gather_direct_dependencies(
			self,
			sorted_factor: SortableObjectiveFactor, formula: Optional[ComputedObjectiveParameter]
	) -> Tuple[bool, List[ObjectiveFactorId]]:
		if formula is None:
			return True, []

		def find_references(parameter: ObjectiveParameter) -> Tuple[bool, List[ObjectiveFactorId]]:
			if isinstance(parameter, ComputedObjectiveParameter):
				return self.gather_direct_dependencies(sorted_factor, parameter)
			elif isinstance(parameter, ReferObjectiveParameter):
				if is_not_blank(parameter.uuid) and parameter.uuid != sorted_factor.factor.uuid:
					return True, [parameter.uuid]
				elif isinstance(sorted_factor.factor, ObjectiveFactorOnComputation):
					# cannot refer to myself if it is in compute factor
					# which means it cannot be computed anymore, thus, dependency is not required.
					return False, []
				else:
					return True, []
			else:
				return True, []

		references = ArrayHelper(formula.parameters).map(find_references)
		if references.some(lambda x: not x[0]):
			# any one is invalid
			return False, []
		else:
			return True, references.map(lambda x: x[1]).flatten().distinct().to_list()

	# noinspection PyMethodMayBeStatic
	def gather_all_dependencies(
			self, factor: SortableObjectiveFactor, factor_map: Dict[ObjectiveFactorId, SortableObjectiveFactor]):
		# already determined as invalid
		if factor.invalid:
			return

		depends = factor.depends
		# no dependency
		if len(depends) == 0:
			factor.allDepends = []
			return

		all_dependencies: List[SortableObjectiveFactor] = \
			ArrayHelper(factor.depends) \
				.map(lambda x: factor_map.get(x)) \
				.to_list()
		if ArrayHelper(all_dependencies).some(lambda x: x.invalid):
			# any dependency is invalid
			factor.invalid = True
			return

		def gather_dependencies(all_dependency_ids: List[ObjectiveFactorId], dependency: SortableObjectiveFactor):
			ArrayHelper(dependency.allDepends) \
				.filter(lambda x: x not in all_dependency_ids) \
				.each(lambda x: all_dependency_ids.append(x))
			return all_dependency_ids

		factor.allDepends = ArrayHelper(all_dependencies) \
			.reduce(gather_dependencies, ArrayHelper(all_dependencies).map(lambda x: x.factor.uuid).to_list())

	def sort_factors(self, factors: List[ObjectiveFactor]) -> List[SortableObjectiveFactor]:
		"""
		returns valid factors and sorted by computation order
		"""

		def as_sorted(factor: ObjectiveFactor) -> SortableObjectiveFactor:
			sof = SortableObjectiveFactor(factor=factor, invalid=False, depends=[], allDepends=[])
			if isinstance(factor, ObjectiveFactorOnComputation) and factor.formula is None:
				sof.invalid = True
				return sof

			valid, dependency_ids = self.gather_direct_dependencies(sof, factor.formula)
			if valid:
				sof.depends = dependency_ids
			else:
				sof.invalid = True
			return sof

		def compare(one: SortableObjectiveFactor, another: SortableObjectiveFactor) -> int:
			if one.factor.uuid in another.allDepends:
				return -1
			elif another.factor.uuid in one.allDepends:
				return 1
			else:
				return 0

		# as sorted, factor should be flagged as invalid if direct dependencies are invalid.
		sorted_factors = ArrayHelper(factors).map(as_sorted)
		sorted_factor_map: Dict[ObjectiveFactorId, SortableObjectiveFactor] = \
			sorted_factors.to_map(lambda x: x.factor.uuid, lambda x: x)
		return sorted_factors \
			.each(lambda x: self.gather_all_dependencies(x, sorted_factor_map)) \
			.filter(lambda x: not x.invalid) \
			.sort(compare) \
			.to_list()

	def is_condition_matched(
			self,
			condition: Optional[ObjectiveParameterCondition],
			factor_values: Dict[ObjectiveFactorId, TempObjectiveFactorValues],
			base_on: Callable[[TempObjectiveFactorValues], Optional[Decimal]]) -> Tuple[bool, bool]:
		"""
		:return: valid/matched or not
		"""
		if isinstance(condition, ObjectiveParameterExpression):
			if condition.left is None:
				return False, False

			left_valid, left_value = self.compute_parameter_value(condition.left, factor_values, base_on)
			if not left_valid:
				return False, False

			condition_operator = condition.operator
			if condition_operator == ObjectiveParameterExpressionOperator.EMPTY:
				return True, is_blank(left_value)
			elif condition_operator == ObjectiveParameterExpressionOperator.NOT_EMPTY:
				return True, is_not_blank(left_value)

			if condition.right is None:
				return False, False
			right_valid, right_value = self.compute_parameter_value(condition.right, factor_values, base_on)
			if not right_valid:
				return False, False
			if condition_operator == ObjectiveParameterExpressionOperator.EQUALS:
				return True, str(left_value) == str(right_value)
			elif condition_operator == ObjectiveParameterExpressionOperator.NOT_EQUALS:
				return True, str(left_value) != str(right_value)

			def compute_number_values(
					left: Any, right: Any, func: Callable[[Decimal, Decimal], bool]) -> Tuple[bool, bool]:
				is_left_valid, l_value = is_decimal(left)
				if not is_left_valid:
					return False, False
				is_right_valid, r_value = is_decimal(right)
				if not is_right_valid:
					return False, False
				return True, func(l_value, r_value)

			if condition_operator == ObjectiveParameterExpressionOperator.LESS:
				return compute_number_values(left_value, right_value, lambda l, r: l < r)
			elif condition_operator == ObjectiveParameterExpressionOperator.LESS_EQUALS:
				return compute_number_values(left_value, right_value, lambda l, r: l <= r)
			elif condition_operator == ObjectiveParameterExpressionOperator.MORE:
				return compute_number_values(left_value, right_value, lambda l, r: l > r)
			elif condition_operator == ObjectiveParameterExpressionOperator.MORE_EQUALS:
				return compute_number_values(left_value, right_value, lambda l, r: l >= r)

			def compute_in_values(
					left: Any, right: Any, includes: bool) -> Tuple[bool, bool]:
				if is_blank(right):
					return True, not includes
				r_values = ArrayHelper(str(right).split(',')) \
					.map(lambda x: x.strip()) \
					.filter(lambda x: len(x) != 0) \
					.to_list()
				l_value = str(left).strip()
				if includes:
					return True, l_value in r_values
				else:
					return True, l_value not in r_values

			if condition_operator == ObjectiveParameterExpressionOperator.IN:
				return compute_in_values(left_value, right_value, True)
			elif condition_operator == ObjectiveParameterExpressionOperator.NOT_IN:
				return compute_in_values(left_value, right_value, False)
			else:
				return False, False
		elif isinstance(condition, ObjectiveParameterJoint):
			if condition.filters is None or len(condition.filters) == 0:
				return False, False
			exps = ArrayHelper(condition.filters) \
				.map(lambda x: self.is_condition_matched(x, factor_values, base_on))
			if exps.some(lambda x: not x[0]):
				return False, False
			elif condition.conj != ObjectiveParameterJointType.OR and exps.every(lambda x: x[1]):
				return True, True
			elif condition.conj == ObjectiveParameterJointType.OR and exps.some(lambda x: x[1]):
				return True, True
			else:
				return True, False
		else:
			return False, False

	def find_positive_case(
			self,
			parameter: ObjectiveParameter,
			factor_values: Dict[ObjectiveFactorId, TempObjectiveFactorValues],
			base_on: Callable[[TempObjectiveFactorValues], Optional[Decimal]]) -> Tuple[bool, bool, ObjectiveParameter]:
		"""
		:return: valid/condition matched or not/passed parameter itself
		"""
		valid, matched = self.is_condition_matched(parameter.on, factor_values, base_on)
		if not valid:
			return False, False, parameter
		else:
			return True, matched, parameter

	def numeric_reduce(
			self,
			parameter: ComputedObjectiveParameter,
			factor_values: Dict[ObjectiveFactorId, TempObjectiveFactorValues],
			base_on: Callable[[TempObjectiveFactorValues], Optional[Decimal]],
			func: Callable[[Decimal, Decimal], Decimal]) -> Tuple[bool, Optional[Decimal]]:
		param_values = ArrayHelper(parameter.parameters) \
			.map(lambda x: self.compute_parameter_value(x, factor_values, base_on))
		if param_values.some(lambda x: not x[0]):
			return False, None

		param_values = param_values.map(lambda x: is_decimal(x[1]))
		if param_values.some(lambda x: not x[0] or x[1] is None):
			return False, None
		# noinspection PyBroadException
		try:
			return True, param_values.map(lambda x: x[1]).reduce(lambda a, e: func(a, e))
		except:
			return False, None

	def numeric_pair(
			self,
			parameter: ComputedObjectiveParameter,
			factor_values: Dict[ObjectiveFactorId, TempObjectiveFactorValues],
			base_on: Callable[[TempObjectiveFactorValues], Optional[Decimal]],
			func: Callable[[Decimal, Decimal], Decimal]) -> Tuple[bool, Optional[Decimal]]:
		valid, param_value = self.compute_parameter_value(parameter.parameters[0], factor_values, base_on)
		if not valid:
			return False, None
		valid, digits = self.compute_parameter_value(parameter.parameters[1], factor_values, base_on)
		if not valid:
			return False, None

		param_values = ArrayHelper([param_value, digits]).map(lambda x: is_decimal(x))
		if param_values.some(lambda x: not x[0] or x[1] is None):
			return False, None
		# noinspection PyBroadException
		try:
			return True, func(param_value, digits)
		except:
			return False, None

	def date_part(
			self,
			parameter: ComputedObjectiveParameter,
			factor_values: Dict[ObjectiveFactorId, TempObjectiveFactorValues],
			base_on: Callable[[TempObjectiveFactorValues], Optional[Decimal]],
			func: Callable[[date], int]) -> Tuple[bool, Optional[int]]:
		valid, param_value = self.compute_parameter_value(parameter.parameters[0], factor_values, base_on)
		if not valid:
			return False, None

		if isinstance(param_value, date):
			return True, func(param_value)
		parsed, dt_value = is_date(param_value, ask_all_date_formats())
		if not parsed:
			return False, None
		if dt_value is None:
			return False, None
		return True, func(dt_value)

	def compute_parameter_value(
			self,
			parameter: ObjectiveParameter,
			factor_values: Dict[ObjectiveFactorId, TempObjectiveFactorValues],
			base_on: Callable[[TempObjectiveFactorValues], Optional[Decimal]]
	) -> Tuple[bool, Optional[Any]]:
		if isinstance(parameter, ReferObjectiveParameter):
			values = factor_values[parameter.uuid]
			if values is None or values.failed:
				return False, None
			else:
				return True, base_on(values)
		elif isinstance(parameter, ConstantObjectiveParameter):
			param = ConstantParameter(
				kind=ParameterKind.CONSTANT,
				value=parameter.value
			)
			parsed = parse_parameter_in_memory(param, self.get_principal_service())
			variables = PipelineVariables(None, self.variablesOnValueMap, None)
			return True, parsed.value(variables, self.get_principal_service())
		elif isinstance(parameter, ComputedObjectiveParameter):
			compute_operator = parameter.operator

			if compute_operator == ObjectiveFormulaOperator.ADD:
				return self.numeric_reduce(parameter, factor_values, base_on, lambda x, y: x + y)
			elif compute_operator == ObjectiveFormulaOperator.SUBTRACT:
				return self.numeric_reduce(parameter, factor_values, base_on, lambda x, y: x - y)
			elif compute_operator == ObjectiveFormulaOperator.MULTIPLY:
				return self.numeric_reduce(parameter, factor_values, base_on, lambda x, y: x * y)
			elif compute_operator == ObjectiveFormulaOperator.DIVIDE:
				return self.numeric_reduce(parameter, factor_values, base_on, lambda x, y: x / y)
			elif compute_operator == ObjectiveFormulaOperator.MODULUS:
				return self.numeric_reduce(parameter, factor_values, base_on, lambda x, y: x % y)
			elif compute_operator == ObjectiveFormulaOperator.YEAR_OF:
				return self.date_part(parameter, factor_values, base_on, get_year)
			elif compute_operator == ObjectiveFormulaOperator.HALF_YEAR_OF:
				return self.date_part(parameter, factor_values, base_on, get_half_year)
			elif compute_operator == ObjectiveFormulaOperator.QUARTER_OF:
				return self.date_part(parameter, factor_values, base_on, get_quarter)
			elif compute_operator == ObjectiveFormulaOperator.MONTH_OF:
				return self.date_part(parameter, factor_values, base_on, get_month)
			elif compute_operator == ObjectiveFormulaOperator.WEEK_OF_YEAR:
				return self.date_part(parameter, factor_values, base_on, get_week_of_year)
			elif compute_operator == ObjectiveFormulaOperator.WEEK_OF_MONTH:
				return self.date_part(parameter, factor_values, base_on, get_week_of_month)
			elif compute_operator == ObjectiveFormulaOperator.DAY_OF_MONTH:
				return self.date_part(parameter, factor_values, base_on, get_day_of_month)
			elif compute_operator == ObjectiveFormulaOperator.DAY_OF_WEEK:
				return self.date_part(parameter, factor_values, base_on, get_day_of_week)
			elif compute_operator == ObjectiveFormulaOperator.ROUND:
				return self.numeric_reduce(parameter, factor_values, base_on, lambda v, d: round(v, d))
			elif compute_operator == ObjectiveFormulaOperator.FLOOR:
				return self.numeric_reduce(
					parameter, factor_values, base_on,
					lambda v, d: floor(v) if d == 0 else floor(v * pow(10, d)) / pow(10, d))
			elif compute_operator == ObjectiveFormulaOperator.CEIL:
				return self.numeric_reduce(
					parameter, factor_values, base_on,
					lambda v, d: ceil(v) if d == 0 else ceil(v * pow(10, d)) / pow(10, d))
			elif compute_operator == ObjectiveFormulaOperator.ABS:
				is_valid, value = self.compute_parameter_value(parameter.parameters[0], factor_values, base_on)
				if not is_valid:
					return False, None
				is_valid, value = is_decimal(value)
				if not is_valid:
					return False, None
				# noinspection PyBroadException
				try:
					return True, abs(value)
				except:
					return False, None
			elif compute_operator == ObjectiveFormulaOperator.MAX:
				return self.numeric_reduce(parameter, factor_values, base_on, lambda x, y: x if x > y else y)
			elif compute_operator == ObjectiveFormulaOperator.MIN:
				return self.numeric_reduce(parameter, factor_values, base_on, lambda x, y: x if x < y else y)
			elif compute_operator == ObjectiveFormulaOperator.INTERPOLATE:
				def ask_param_value(param_index: int) -> Tuple[bool, Optional[Decimal]]:
					valid, param_value = self.compute_parameter_value(
						parameter.parameters[param_index], factor_values, base_on)
					if not valid:
						return False, None
					return self.compute_parameter_value(parameter.parameters[1], factor_values, base_on)

				values = ArrayHelper([0, 1, 2, 3, 4]).map(ask_param_value)
				if values.some(lambda x: not x[0]):
					return False, None
				values = values.map(lambda x: x[1]).to_list()
				if values[1] > values[3]:
					return False, None
				if values[0] <= values[1]:
					return True, values[2]
				if values[0] >= values[3]:
					return True, values[4]
				else:
					return values[2] + (values[0] - values[1]) / (values[3] - values[1]) * (values[4] - values[2])
			elif compute_operator == ObjectiveFormulaOperator.CASE_THEN:
				cases = parameter.parameters
				if cases is None or len(cases) == 0:
					return False, None
				anyways: List[ObjectiveParameter] = ArrayHelper(cases).filter(lambda x: not x.conditional).to_list()
				if len(anyways) > 1:
					return False, None

				routes = ArrayHelper(cases).filter(lambda x: x.conditional).to_list()
				for route in routes:
					is_valid, found, parameter = self.find_positive_case(route, factor_values, base_on)
					if not is_valid:
						return False, None
					if found:
						return self.compute_parameter_value(route, factor_values, base_on)
				# no route matched, try to find anyway route
				if len(anyways) == 1:
					return self.compute_parameter_value(anyways[0], factor_values, base_on)
				else:
					return False, None
			else:
				return False, None
		else:
			return False, None

	def compute_factor_value(
			self,
			factor: ObjectiveFactor, factor_values: Dict[ObjectiveFactorId, TempObjectiveFactorValues],
			get_time_frame: Callable[[], Optional[TimeFrame]],
			set_value: Callable[[TempObjectiveFactorValues, Optional[Decimal]], None],
			ask_value: Callable[[TempObjectiveFactorValues], Optional[Decimal]]):
		if isinstance(factor, ObjectiveFactorOnIndicator):
			self.ask_indicator_factor_value(factor, factor_values[factor.uuid], get_time_frame, set_value)

		if factor.formula is not None:
			if isinstance(factor.formula, ComputedObjectiveParameter) \
					and factor.formula.operator == ObjectiveFormulaOperator.NONE:
				# as-is, do nothing
				pass
			else:
				computed, value = self.compute_parameter_value(factor.formula, factor_values, ask_value)
				if computed:
					set_value(factor_values[factor.uuid], value)
				else:
					factor_values[factor.uuid].failed = True

	def compute_factor_value_on_current_time_frame(
			self, factor: ObjectiveFactor, factor_values: Dict[ObjectiveFactorId, TempObjectiveFactorValues]):
		self.compute_factor_value(
			factor, factor_values, self.get_current_time_frame, self.set_value_to_current, lambda x: x.currentValue)

	def ask_previous_value(
			self,
			values: TempObjectiveFactorValues, factor_values: Dict[ObjectiveFactorId, TempObjectiveFactorValues]
	) -> Optional[Decimal]:
		if values.previousAsked:
			return values.previousValue
		# compute first
		self.compute_factor_value_on_previous_time_frame(values.factor, factor_values)
		return values.previousValue

	def compute_factor_value_on_previous_time_frame(
			self, factor: ObjectiveFactor, factor_values: Dict[ObjectiveFactorId, TempObjectiveFactorValues]):
		self.compute_factor_value(
			factor, factor_values,
			self.get_previous_time_frame, self.set_value_to_previous,
			lambda x: self.ask_previous_value(x, factor_values))

	def ask_chain_value(
			self,
			values: TempObjectiveFactorValues, factor_values: Dict[ObjectiveFactorId, TempObjectiveFactorValues]
	) -> Optional[Decimal]:
		if values.chainAsked:
			return values.chainValue
		# compute first
		self.compute_factor_value_on_chain_time_frame(values.factor, factor_values)
		return values.chainValue

	def compute_factor_value_on_chain_time_frame(
			self, factor: ObjectiveFactor, factor_values: Dict[ObjectiveFactorId, TempObjectiveFactorValues]):

		self.compute_factor_value(
			factor, factor_values,
			self.get_chain_time_frame, self.set_value_to_chain, lambda x: self.ask_chain_value(x, factor_values))

	def compute_target_value(
			self, target: ObjectiveTarget, factor_values: Dict[ObjectiveFactorId, TempObjectiveFactorValues]
	) -> ObjectiveTargetValues:
		# construct target values
		values = ObjectiveTargetValues(uuid=target.uuid, target=target)
		if target.asis is None:
			# asis not declared, no need to compute, returns failed directly
			values.failed = True
			return values

		need_previous = False if target.askPreviousCycle is None else target.askPreviousCycle
		need_chain = False if target.askChainCycle is None else target.askChainCycle

		if isinstance(target.asis, ComputedObjectiveParameter):
			# compute current value
			computed, value = self.compute_parameter_value(target.asis, factor_values, lambda x: x.currentValue)
			if computed:
				values.currentValue = value
			else:
				values.failed = True
				return values
			if need_previous:
				computed, value = self.compute_parameter_value(
					target.asis, factor_values, lambda x: self.ask_previous_value(x, factor_values))
				if computed:
					values.previousValue = value
			if need_chain:
				computed, value = self.compute_parameter_value(
					target.asis, factor_values, lambda x: self.ask_chain_value(x, factor_values))
				if computed:
					values.chainValue = value
		else:
			# asis is referred to an objective factor, get value from factor values
			computed_factor_values = factor_values[target.asis]
			if computed_factor_values is None or computed_factor_values.failed:
				# factor values not found or it is failed already
				values.failed = True
				return values
			else:
				# copy from factor values
				values.currentValue = computed_factor_values.currentValue

			# on previous/chain value, check corresponding values on factor are asked or not
			# ask value when it is not asked yet
			if need_previous:
				if not computed_factor_values.previousAsked:
					self.compute_factor_value_on_previous_time_frame(computed_factor_values.factor, factor_values)
				values.previousValue = computed_factor_values.previousValue
			if need_chain:
				if not computed_factor_values.chainAsked:
					self.compute_factor_value_on_chain_time_frame(computed_factor_values.factor, factor_values)
				values.chainValue = computed_factor_values.chainValue
		return values

	def ask_values(self) -> ObjectiveValues:
		# get factors
		factors = self.get_objective().factors
		# initialize factor values
		factor_values: Dict[ObjectiveFactorId, TempObjectiveFactorValues] = ArrayHelper(factors) \
			.map(lambda x: TempObjectiveFactorValues(uuid=x.uuid, factor=x)) \
			.to_map(lambda x: x.uuid, lambda x: x)
		# sort by formula dependency, invalid factors are filtered already
		sorted_factors: List[SortableObjectiveFactor] = self.sort_factors(factors)
		valid_factor_ids = ArrayHelper(sorted_factors).map(lambda x: x.factor.uuid).to_list()

		def fail_factor(factor: TempObjectiveFactorValues):
			factor.failed = True

		# set factor as failed if it is not in valid list
		ArrayHelper(list(factor_values.values())) \
			.filter(lambda x: x.uuid not in valid_factor_ids) \
			.each(fail_factor)

		# compute factor values on current time frame
		ArrayHelper(sorted_factors) \
			.each(lambda x: self.compute_factor_value_on_current_time_frame(x.factor, factor_values))

		# compute target values
		targets = self.get_objective().targets
		target_values = ArrayHelper(targets).map(lambda x: self.compute_target_value(x, factor_values)).to_list()

		def formalize_factor_values(values: TempObjectiveFactorValues) -> ObjectiveFactorValues:
			return ObjectiveFactorValues(
				uuid=values.uuid,
				currentValue=values.currentValue, previousValue=values.previousValue, chainValue=values.chainValue,
				failed=values.failed
			)

		return ObjectiveValues(
			factors=ArrayHelper(list(factor_values.values())).map(formalize_factor_values).to_list(),
			targets=target_values)




