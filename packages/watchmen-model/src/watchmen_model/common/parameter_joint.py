from enum import Enum
from typing import List

from pydantic import BaseModel

from .parameter_condition import ParameterCondition


class ParameterJointType(str, Enum):
	AND = 'and',
	OR = 'or'


class ParameterJoint(ParameterCondition, BaseModel):
	jointType: ParameterJointType = ParameterJointType.AND
	filters: List[ParameterCondition] = []
