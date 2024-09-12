from enum import Enum
from typing import List, Optional, Union


from watchmen_model.common import Auditable, BucketId, DataModel, DerivedObjectiveId, FactorId, LastVisit, \
	ObjectiveId, ObjectiveTargetId, SubjectDatasetColumnId, UserBasedTuple, BreakdownTargetId
from watchmen_utilities import ArrayHelper, ExtendedBaseModel
from .measure_method import MeasureMethod
from .objective import Objective


def construct_objective(definition: Optional[Union[dict, Objective]]) -> Optional[Objective]:
	if definition is None:
		return None
	elif isinstance(definition, Objective):
		return definition
	else:
		# noinspection PyArgumentList
		return Objective(**definition)


class BreakdownDimensionType(str, Enum):
	VALUE = 'value',
	BUCKET = 'bucket',
	TIME_RELATED = 'time'


class BreakdownDimension(ExtendedBaseModel):
	"""
	when type is VALUE, which means no bucket, no time measure method. use the original value as dimension
	"""
	type:Optional[BreakdownDimensionType] = None
	# if measure on factor, factor id must be given
	factorOrColumnId: Optional[Union[FactorId, SubjectDatasetColumnId]] = None
	# bucket for any measure on type
	bucketId: Optional[BucketId] = None
	# only when factor/column is date, and adaptable time measure method could be applied
	# for example, if factor is date, then YEAR/QUARTER/MONTH/etc. could be applied to it
	# if factor is year, then only YEAR could be applied to it.
	timeMeasureMethod: Optional[MeasureMethod] = None


def construct_breakdown_dimension(dimension: Optional[Union[dict, BreakdownDimension]]) -> Optional[BreakdownDimension]:
	if dimension is None:
		return None
	elif isinstance(dimension, BreakdownDimension):
		return dimension
	else:
		return BreakdownDimension(**dimension)


def construct_breakdown_dimensions(dimensions: Optional[list] = None) -> Optional[List[BreakdownDimension]]:
	if dimensions is None:
		return []
	else:
		return ArrayHelper(dimensions).map(lambda x: construct_breakdown_dimension(x)).to_list()


class BreakdownTarget(ExtendedBaseModel):
	uuid: Optional[BreakdownTargetId] = None
	targetId: Optional[ObjectiveTargetId] = None
	name: Optional[str] = None
	dimensions: List[BreakdownDimension] = []

	def __setattr__(self, name, value):
		if name == 'dimensions':
			super().__setattr__(name, construct_breakdown_dimensions(value))
		else:
			super().__setattr__(name, value)


def construct_breakdown_target(target: Optional[Union[dict, BreakdownTarget]]) -> Optional[BreakdownTarget]:
	if target is None:
		return None
	elif isinstance(target, BreakdownTarget):
		return target.dict()
	else:
		return BreakdownTarget(**target)


def construct_breakdown_targets(targets: Optional[list] = None) -> Optional[List[BreakdownTarget]]:
	if targets is None:
		return []
	else:
		return ArrayHelper(targets).map(lambda x: construct_breakdown_target(x)).to_list()


class DerivedObjective(ExtendedBaseModel, UserBasedTuple, Auditable, LastVisit):
	derivedObjectiveId: Optional[DerivedObjectiveId] = None
	name: Optional[str] = None
	description: Optional[str] = None
	objectiveId: Optional[ObjectiveId] = None
	definition: Optional[Objective] = None
	breakdownTargets: Optional[List[BreakdownTarget]] = None

	def __setattr__(self, name, value):
		if name == 'definition':
			super().__setattr__(name, construct_objective(value))
		elif name == 'breakdownTargets':
			super().__setattr__(name, construct_breakdown_targets(value))
		else:
			super().__setattr__(name, value)





