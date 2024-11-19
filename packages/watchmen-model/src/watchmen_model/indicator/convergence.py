from enum import Enum
from typing import List, Optional, Union

from watchmen_model.common import BucketId, ConvergenceId, ConvergenceTargetId, ConvergenceTargetVariableMappingId, \
	ConvergenceVariableId, DataModel, ObjectiveId, ObjectiveTargetId, OptimisticLock, TenantBasedTuple, UserGroupId
from watchmen_utilities import ArrayHelper, ExtendedBaseModel


class ConvergenceVariableType(str, Enum):
	TIMEFRAME = 'timeframe',
	BUCKET = 'bucket',
	FREE_WALK = 'free-walk'


class ConvergenceVariableAxis(str, Enum):
	X = 'x'
	Y = 'y'


class ConvergenceVariable(ExtendedBaseModel):
	uuid: Optional[ConvergenceVariableId] = None
	type: Optional[ConvergenceVariableType] = None
	name: Optional[str] = None
	axis: Optional[ConvergenceVariableAxis] = None


class ConvergenceTimeFrameVariableKind(str, Enum):
	YEAR = 'year',
	HALF_YEAR = 'half-year',
	QUARTER = 'quarter',
	MONTH = 'month',
	WEEK = 'week',
	DAY = 'day'


class TimeFrameConvergenceVariableValue(ExtendedBaseModel):
	start: Optional[str] = None
	end: Optional[str] = None


def construct_timeframe_variable_value(
		target: Optional[Union[dict, TimeFrameConvergenceVariableValue]]
) -> Optional[TimeFrameConvergenceVariableValue]:
	if target is None:
		return None
	elif isinstance(target, TimeFrameConvergenceVariableValue):
		return target
	else:
		# noinspection PyArgumentList
		return TimeFrameConvergenceVariableValue(**target)


def construct_timeframe_variable_values(
		targets: Optional[list] = None) -> Optional[List[TimeFrameConvergenceVariableValue]]:
	if targets is None:
		return None
	else:
		return ArrayHelper(targets).map(lambda x: construct_timeframe_variable_value(x)).to_list()


class ConvergenceTimeFrameVariable(ConvergenceVariable):
	type: ConvergenceVariableType = ConvergenceVariableType.TIMEFRAME
	# use kind and till to compute values
	kind: ConvergenceTimeFrameVariableKind = None
	till: str = None
	times: int = None
	values: List[TimeFrameConvergenceVariableValue] = []

	def __setattr__(self, name, value):
		if name == 'values':
			super().__setattr__(name, construct_timeframe_variable_values(value))
		else:
			super().__setattr__(name, value)


class ConvergenceBucketVariable(ConvergenceVariable):
	type: ConvergenceVariableType = ConvergenceVariableType.BUCKET
	bucketId: BucketId = None


class ConvergenceFreeWalkVariable(ConvergenceVariable):
	type: ConvergenceVariableType = ConvergenceVariableType.FREE_WALK
	values: List[str] = []


CONVERGENCE_TARGET_VARIABLE_MAPPING_IGNORED = '#'


class ConvergenceTargetVariableMapping(ExtendedBaseModel):
	uuid: Optional[ConvergenceTargetVariableMappingId] = None
	objectiveVariableName: Optional[str] = None
	#CONVERGENCE_TARGET_VARIABLE_MAPPING_IGNORED
	variableId: Optional[ConvergenceVariableId] = None


def construct_target_mapping(target: Optional[Union[dict, ConvergenceTargetVariableMapping]]) -> Optional[
	ConvergenceTargetVariableMapping]:
	if target is None:
		return None
	elif isinstance(target, ConvergenceTargetVariableMapping):
		return target
	else:
		# noinspection PyArgumentList
		return ConvergenceTargetVariableMapping(**target)


def construct_target_mappings(targets: Optional[list] = None) -> Optional[List[ConvergenceTargetVariableMapping]]:
	if targets is None:
		return None
	else:
		return ArrayHelper(targets).map(lambda x: construct_target_mapping(x)).to_list()


class ConvergenceTarget(ExtendedBaseModel):
	uuid: Optional[ConvergenceTargetId] = None
	objectiveId:  Optional[ObjectiveId] = None
	targetId:  Optional[ObjectiveTargetId] = None
	useTimeFrame:  Optional[bool] = None
	mapping: List[ConvergenceTargetVariableMapping] = []
	# starts from 0
	row:  Optional[int] = None
	# starts from 0
	col:  Optional[int] = None

	def __setattr__(self, name, value):
		if name == 'mapping':
			super().__setattr__(name, construct_target_mappings(value))
		else:
			super().__setattr__(name, value)


def construct_target(target: Optional[Union[dict, ConvergenceTarget]]) -> Optional[ConvergenceTarget]:
	if target is None:
		return None
	elif isinstance(target, ConvergenceTarget):
		return target
	else:
		# noinspection PyArgumentList
		return ConvergenceTarget(**target)


def construct_targets(targets: Optional[list] = None) -> Optional[List[ConvergenceTarget]]:
	if targets is None:
		return None
	else:
		return ArrayHelper(targets).map(lambda x: construct_target(x)).to_list()


def construct_variable(variable: Optional[Union[dict, ConvergenceVariable]]) -> Optional[ConvergenceVariable]:
	if variable is None:
		return None
	elif isinstance(variable, ConvergenceVariable):
		return variable
	else:
		type = variable.get('type')
		if type == ConvergenceVariableType.BUCKET:
			return ConvergenceBucketVariable(**variable)
		elif type == ConvergenceVariableType.TIMEFRAME:
			return ConvergenceTimeFrameVariable(**variable)
		elif type == ConvergenceVariableType.FREE_WALK:
			return ConvergenceFreeWalkVariable(**variable)
		else:
			raise Exception(f'Convergence variable type[{type}] cannot be recognized.')


def construct_variables(variables: Optional[list] = None) -> Optional[List[ConvergenceVariable]]:
	if variables is None:
		return None
	else:
		return ArrayHelper(variables).map(lambda x: construct_variable(x)).to_list()


class Convergence(ExtendedBaseModel, TenantBasedTuple, OptimisticLock):
	convergenceId: Optional[ConvergenceId] = None
	name: Optional[str] = None
	description: Optional[str] = None
	variables: List[ConvergenceVariable] = []
	targets: List[ConvergenceTarget] = []
	groupIds: Optional[List[UserGroupId]] = None

	def __setattr__(self, name, value):
		if name == 'targets':
			super().__setattr__(name, construct_targets(value))
		elif name == 'variables':
			super().__setattr__(name, construct_variables(value))
		else:
			super().__setattr__(name, value)
