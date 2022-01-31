from enum import Enum
from typing import List, Optional

from .model import DataModel
from .parameter_joint import ParameterJoint
from .tuple_ids import FactorId, TopicId


class ParameterKind(str, Enum):
	TOPIC = 'topic',
	CONSTANT = 'constant',
	COMPUTED = 'computed'


class Parameter(DataModel):
	kind: ParameterKind = None
	conditional: bool = False
	on: Optional[ParameterJoint] = None


class TopicFactorParameter(Parameter):
	kind: ParameterKind.TOPIC = ParameterKind.TOPIC
	topicId: TopicId = None
	factorId: FactorId = None


class ConstantParameter(Parameter):
	kind: ParameterKind.CONSTANT = ParameterKind.CONSTANT
	value: str = None


class ParameterComputeType(str, Enum):
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
	CASE_THEN = 'case-then'


class ComputedParameter(Parameter):
	kind: ParameterKind.COMPUTED = ParameterKind.COMPUTED
	type: ParameterComputeType = ParameterComputeType.NONE
	parameters: List[Parameter] = []
