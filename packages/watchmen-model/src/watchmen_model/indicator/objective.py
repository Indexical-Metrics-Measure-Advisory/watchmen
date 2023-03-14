from __future__ import annotations

from enum import Enum
from typing import List, Optional, TypeVar, Union

from pydantic import BaseModel

from watchmen_model.common import BucketId, DataModel, FactorId, IndicatorId, ObjectiveFactorId, ObjectiveId, \
	ObjectiveTargetId, OptimisticLock, SubjectDatasetColumnId, TenantBasedTuple, UserGroupId
from watchmen_utilities import ArrayHelper

ObjectiveFactorName = TypeVar('ObjectiveFactorName', bound=str)


def construct_parameter_joint(
		joint: Optional[Union[dict, ObjectiveParameterJoint]]) -> Optional[ObjectiveParameterJoint]:
	if joint is None:
		return None
	elif isinstance(joint, ObjectiveParameterJoint):
		return joint
	else:
		# noinspection PyArgumentList
		return ObjectiveParameterJoint(**joint)


def construct_computed_parameter(
		parameter: Optional[Union[dict, ComputedObjectiveParameter]]) -> Optional[ComputedObjectiveParameter]:
	if parameter is None:
		return None
	elif isinstance(parameter, ComputedObjectiveParameter):
		return parameter
	else:
		# noinspection PyArgumentList
		return ComputedObjectiveParameter(**parameter)


def construct_parameter(parameter: Optional[Union[dict, ObjectiveParameter]]) -> Optional[ObjectiveParameter]:
	if parameter is None:
		return None
	elif isinstance(parameter, ObjectiveParameter):
		return parameter
	else:
		kind = parameter.get('kind')
		if kind == ObjectiveParameterType.REFER:
			return ReferObjectiveParameter(**parameter)
		elif kind == ObjectiveParameterType.CONSTANT:
			return ConstantObjectiveParameter(**parameter)
		elif kind == ObjectiveParameterType.COMPUTED:
			return ComputedObjectiveParameter(**parameter)
		elif kind == ObjectiveParameterType.BUCKET:
			return BucketObjectiveParameter(**parameter)
		elif kind == ObjectiveParameterType.TIME_FRAME:
			return TimeFrameObjectiveParameter(**parameter)
		else:
			raise Exception(f'Parameter kind[{kind}] cannot be recognized.')


def construct_parameters(parameters: Optional[list]) -> Optional[List[ObjectiveParameter]]:
	if parameters is None:
		return None
	return ArrayHelper(parameters).map(lambda x: construct_parameter(x)).to_list()


def construct_parameter_condition(
		condition: Optional[Union[dict, ObjectiveParameterCondition]]) -> Optional[ObjectiveParameterCondition]:
	if condition is None:
		return None
	elif isinstance(condition, ObjectiveParameterJoint):
		return condition
	elif isinstance(condition, ObjectiveParameterExpression):
		return condition
	else:
		joint_type = condition.get('jointType')
		if joint_type is None:
			return ObjectiveParameterExpression(**condition)
		else:
			return ObjectiveParameterJoint(**condition)


def construct_parameter_conditions(conditions: Optional[list]) -> Optional[List[ObjectiveParameterCondition]]:
	if conditions is None:
		return None
	return ArrayHelper(conditions).map(lambda x: construct_parameter_condition(x)).to_list()


class ObjectiveParameterType(str, Enum):
	REFER = 'refer',
	CONSTANT = 'constant',
	COMPUTED = 'computed',
	# only available on factor indicator filter
	BUCKET = 'bucket',
	# only available on factor indicator filter
	TIME_FRAME = 'time-frame'


# noinspection DuplicatedCode
class AvoidFastApiError:
	on: Optional[ObjectiveParameterJoint] = None


class ObjectiveParameter(DataModel, AvoidFastApiError, BaseModel):
	kind: ObjectiveParameterType = None
	conditional: bool = False

	def __setattr__(self, name, value):
		if name == 'on':
			super().__setattr__(name, construct_parameter_joint(value))
		else:
			super().__setattr__(name, value)


class ReferObjectiveParameter(ObjectiveParameter):
	"""
	it's a multiple purposes object.
	when it is used in factor/target formula, {@link #uuid} should refer to another objective factor.
	and when it is used in factor filter, {@link #uuid} should refer to factor from topic or column from subject dataset.
	"""
	kind: ObjectiveParameterType.REFER = ObjectiveParameterType.REFER
	uuid: Optional[Union[ObjectiveFactorId, FactorId, SubjectDatasetColumnId]] = None


class ConstantObjectiveParameter(ObjectiveParameter):
	kind: ObjectiveParameterType.CONSTANT = ObjectiveParameterType.CONSTANT
	value: Optional[str] = None


class ObjectiveFormulaOperator(str, Enum):
	NONE = 'none',
	ADD = 'add',
	SUBTRACT = 'subtract',
	MULTIPLY = 'multiply',
	DIVIDE = 'divide',
	MODULUS = 'modulus',
	YEAR_OF = 'year-of',
	HALF_YEAR_OF = 'half-year-of',
	QUARTER_OF = 'quarter-of',
	MONTH_OF = 'month-of',
	WEEK_OF_YEAR = 'week-of-year',
	WEEK_OF_MONTH = 'week-of-month',
	DAY_OF_MONTH = 'day-of-month',
	DAY_OF_WEEK = 'day-of-week',

	ROUND = 'round',
	FLOOR = 'floor',
	CEIL = 'ceil',
	ABS = 'abs',
	MAX = 'max',
	MIN = 'min',
	INTERPOLATE = 'interpolate',

	CASE_THEN = 'case-then',


# noinspection DuplicatedCode
class ComputedObjectiveParameter(ObjectiveParameter):
	kind: ObjectiveParameterType.COMPUTED = ObjectiveParameterType.COMPUTED
	operator: ObjectiveFormulaOperator = ObjectiveFormulaOperator.NONE
	parameters: List[ObjectiveParameter] = []

	def __setattr__(self, name, value):
		if name == 'parameters':
			super().__setattr__(name, construct_parameters(value))
		else:
			super().__setattr__(name, value)


class BucketObjectiveParameter(ObjectiveParameter):
	kind: ObjectiveParameterType.BUCKET = ObjectiveParameterType.BUCKET
	bucketId: Optional[BucketId] = None
	segmentName: Optional[str] = None


class TimeFrameObjectiveParameter(ObjectiveParameter):
	kind: ObjectiveParameterType.TIME_FRAME = ObjectiveParameterType.TIME_FRAME


class ObjectiveParameterCondition(DataModel, BaseModel):
	pass


# noinspection DuplicatedCode
class ObjectiveParameterExpressionOperator(str, Enum):
	EMPTY = 'empty',
	NOT_EMPTY = 'not-empty',
	EQUALS = 'equals',
	NOT_EQUALS = 'not-equals',
	LESS = 'less',
	LESS_EQUALS = 'less-equals',
	MORE = 'more',
	MORE_EQUALS = 'more-equals',
	IN = 'in',
	NOT_IN = 'not-in',


class ObjectiveParameterExpression(ObjectiveParameterCondition):
	left: Optional[ObjectiveParameter] = None
	operator: ObjectiveParameterExpressionOperator = ObjectiveParameterExpressionOperator.EQUALS
	right: Optional[ObjectiveParameter] = None

	def __setattr__(self, name, value):
		if name == 'left' or name == 'right':
			super().__setattr__(name, construct_parameter(value))
		else:
			super().__setattr__(name, value)


class ObjectiveParameterJointType(str, Enum):
	AND = 'and',
	OR = 'or',


class ObjectiveParameterJoint(ObjectiveParameterCondition):
	conj: ObjectiveParameterJointType = ObjectiveParameterJointType.AND
	filters: List[ObjectiveParameterCondition] = []

	def __setattr__(self, name, value):
		if name == 'filters':
			super().__setattr__(name, construct_parameter_conditions(value))
		else:
			super().__setattr__(name, value)


class ObjectiveTimeFrameKind(str, Enum):
	NONE = 'none',
	YEAR = 'year',
	HALF_YEAR = 'half-year',
	QUARTER = 'quarter',
	MONTH = 'month',
	WEEK_OF_YEAR = 'week-of-year',
	DAY_OF_MONTH = 'day-of-month',
	DAY_OF_WEEK = 'day-of-week',
	LAST_N_YEARS = 'last-n-years',
	LAST_N_MONTHS = 'last-n-months',
	LAST_N_WEEKS = 'last-n-weeks',
	LAST_N_DAYS = 'last-n-days'


class ObjectiveTimeFrameTill(str, Enum):
	NOW = 'now',
	LAST_COMPLETE_CYCLE = 'last-complete-cycle',
	SPECIFIED = 'specified'


class ObjectiveTimeFrame(DataModel, BaseModel):
	# is target in time frame, normally is
	kind: Optional[ObjectiveTimeFrameKind] = None
	# only available if kind is LAST_N-* types, should be a positive value
	lastN: str = None
	# time frame is cut off till when
	till: Optional[ObjectiveTimeFrameTill] = None
	# specify the till time when till is SPECIFIED
	specifiedTill: str = None


class ObjectiveTargetBetterSide(str, Enum):
	LESS = 'less',
	MORE = 'more'


def construct_asis(
		asis: Optional[Union[dict, ComputedObjectiveParameter, ObjectiveFactorId]]
) -> Optional[Union[ComputedObjectiveParameter, ObjectiveFactorId]]:
	if asis is None:
		return None
	elif isinstance(asis, str):
		return asis
	elif isinstance(asis, ComputedObjectiveParameter):
		return asis
	else:
		# noinspection PyArgumentList
		return ComputedObjectiveParameter(**asis)


class ObjectiveTarget(DataModel, BaseModel):
	uuid: ObjectiveTargetId = None

	name: Optional[str] = None
	# to be value, should be a numeric value, a percentage value
	tobe: Optional[str] = None
	# as is formula
	asis: Optional[Union[ComputedObjectiveParameter, ObjectiveFactorId]] = None
	# which side is better, with computed as is value vs to be value.
	betterSide: Optional[ObjectiveTargetBetterSide] = None
	# this July vs this June if time frame is on month, month-on-month
	askPreviousCycle: bool = False
	# this July vs last July if time frame is on month, year-on-year
	askChainCycle: bool = False

	def __setattr__(self, name, value):
		if name == 'asis':
			super().__setattr__(name, construct_asis(value))
		else:
			super().__setattr__(name, value)


class ObjectiveVariableKind(str, Enum):
	SINGLE_VALUE = 'value',
	BUCKET = 'bucket',
	RANGE = 'range'


class ObjectiveVariable(DataModel, BaseModel):
	name: str
	kind: ObjectiveVariableKind = None


class ObjectiveVariableOnValue(ObjectiveVariable):
	kind: ObjectiveVariableKind.SINGLE_VALUE = ObjectiveVariableKind.SINGLE_VALUE
	value: Optional[str] = None


class ObjectiveVariableOnBucket(ObjectiveVariable):
	kind: ObjectiveVariableKind.BUCKET = ObjectiveVariableKind.BUCKET
	bucketId: Optional[BucketId] = None
	segmentName: Optional[str] = None


class ObjectiveVariableOnRange(ObjectiveVariable):
	kind: ObjectiveVariableKind = ObjectiveVariableKind.RANGE
	min: Optional[str] = None
	includeMin: Optional[bool] = True
	max: Optional[str] = None
	includeMax: Optional[bool] = False


class ObjectiveFactorKind(str, Enum):
	INDICATOR = 'indicator',
	COMPUTED = 'computed'


class ObjectiveFactor(DataModel, BaseModel):
	uuid: ObjectiveFactorId = None
	kind: ObjectiveFactorKind = None
	name: ObjectiveFactorName = None
	formula: Optional[ComputedObjectiveParameter] = None

	def __setattr__(self, name, value):
		if name == 'formula':
			super().__setattr__(name, construct_computed_parameter(value))
		else:
			super().__setattr__(name, value)


class ObjectiveFactorOnIndicator(ObjectiveFactor):
	kind: ObjectiveFactorKind.INDICATOR = ObjectiveFactorKind.INDICATOR
	indicatorId: Optional[IndicatorId] = None
	conditional: bool = False
	# objective variables are available in constant value
	filter: Optional[ObjectiveParameterJoint] = None

	def __setattr__(self, name, value):
		if name == 'filter':
			super().__setattr__(name, construct_parameter_joint(value))
		else:
			super().__setattr__(name, value)


class ObjectiveFactorOnComputation(ObjectiveFactor):
	kind: ObjectiveFactorKind.COMPUTED = ObjectiveFactorKind.COMPUTED


def construct_time_frame(time_frame: Optional[Union[dict, ObjectiveTimeFrame]]) -> Optional[ObjectiveTimeFrame]:
	if time_frame is None:
		return None
	elif isinstance(time_frame, ObjectiveTimeFrame):
		return time_frame
	else:
		# noinspection PyArgumentList
		return ObjectiveTimeFrame(**time_frame)


def construct_target(target: Optional[Union[dict, ObjectiveTarget]]) -> Optional[ObjectiveTarget]:
	if target is None:
		return None
	elif isinstance(target, ObjectiveTarget):
		return target
	else:
		# noinspection PyArgumentList
		return ObjectiveTarget(**target)


def construct_targets(targets: Optional[list] = None) -> Optional[List[ObjectiveTarget]]:
	if targets is None:
		return None
	else:
		return ArrayHelper(targets).map(lambda x: construct_target(x)).to_list()


def construct_variable(variable: Optional[Union[dict, ObjectiveVariable]]) -> Optional[ObjectiveVariable]:
	if variable is None:
		return None
	elif isinstance(variable, ObjectiveVariable):
		return variable
	else:
		kind = variable.get('kind')
		if kind == ObjectiveVariableKind.SINGLE_VALUE:
			return ObjectiveVariableOnValue(**variable)
		elif kind == ObjectiveVariableKind.RANGE:
			return ObjectiveVariableOnRange(**variable)
		elif kind == ObjectiveVariableKind.BUCKET:
			return ObjectiveVariableOnBucket(**variable)
		else:
			raise Exception(f'Objective variable kind[{kind}] cannot be recognized.')


def construct_variables(variables: Optional[list] = None) -> Optional[List[ObjectiveVariable]]:
	if variables is None:
		return None
	else:
		return ArrayHelper(variables).map(lambda x: construct_variable(x)).to_list()


def construct_factor(factor: Optional[Union[dict, ObjectiveFactor]]) -> Optional[ObjectiveFactor]:
	if factor is None:
		return None
	elif isinstance(factor, ObjectiveFactorOnIndicator):
		return factor
	elif isinstance(factor, ObjectiveFactorOnComputation):
		return factor
	else:
		kind = factor.get('kind')
		if kind == ObjectiveFactorKind.INDICATOR:
			return ObjectiveFactorOnIndicator(**factor)
		elif kind == ObjectiveFactorKind.COMPUTED:
			return ObjectiveFactorOnComputation(**factor)
		else:
			raise Exception(f'Objective factor kind[{kind}] cannot be recognized.')


def construct_factors(factors: Optional[list] = None) -> Optional[List[ObjectiveFactor]]:
	if factors is None:
		return None
	else:
		return ArrayHelper(factors).map(lambda x: construct_factor(x)).to_list()


class Objective(TenantBasedTuple, OptimisticLock, BaseModel):
	objectiveId: ObjectiveId = None
	name: str = None
	description: str = None
	timeFrame: ObjectiveTimeFrame = None
	targets: List[ObjectiveTarget] = []
	variables: List[ObjectiveVariable] = []
	factors: List[ObjectiveFactor] = []
	groupIds: List[UserGroupId] = None

	def __setattr__(self, name, value):
		if name == 'timeFrame':
			super().__setattr__(name, construct_time_frame(value))
		elif name == 'targets':
			super().__setattr__(name, construct_targets(value))
		elif name == 'variables':
			super().__setattr__(name, construct_variables(value))
		elif name == 'factors':
			super().__setattr__(name, construct_factors(value))
		else:
			super().__setattr__(name, value)
