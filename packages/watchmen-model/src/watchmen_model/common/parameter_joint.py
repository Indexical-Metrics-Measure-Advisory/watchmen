from enum import Enum
from typing import List

from .parameter_condition import ParameterCondition


class ParameterJointType(str, Enum):
	AND = 'and',
	OR = 'or'


class ParameterJoint(ParameterCondition):
	jointType: ParameterJointType = ParameterJointType.AND
	filters: List[ParameterCondition] = []
