from enum import Enum
from typing import List, Optional, Union

from watchmen_model.common import Auditable, ConnectedSpaceId, construct_parameter, construct_parameter_conditions, \
	construct_parameter_joint, DataModel, FactorId, LastVisit, Pageable, Parameter, ParameterCondition, \
	ParameterJoint, SubjectDatasetColumnId, SubjectId, TopicId, UserBasedTuple
from watchmen_utilities import ArrayHelper, ExtendedBaseModel


class SubjectJoinType(str, Enum):
	LEFT = 'left',
	RIGHT = 'right',
	INNER = 'inner',


class SubjectDatasetJoin(ExtendedBaseModel):
	topicId: Optional[TopicId] = None
	factorId: Optional[FactorId] = None
	secondaryTopicId: Optional[TopicId] = None
	secondaryFactorId: Optional[FactorId] = None
	type: SubjectJoinType = SubjectJoinType.INNER


class SubjectColumnArithmetic(str, Enum):
	NONE = 'none'
	DISTINCT_COUNT = 'distinct_count'
	COUNT = 'count'
	SUMMARY = 'sum'
	AVERAGE = 'avg'
	MAXIMUM = 'max'
	MINIMUM = 'min'


class SubjectColumnAlignment(str, Enum):
	LEFT = 'left',
	CENTER = 'center',
	RIGHT = 'right'


class SubjectColumnFormat(str, Enum):
	NONE = 'none'
	USE_GROUP = '#,##0',
	USE_GROUP_1 = '#,##0.0',
	USE_GROUP_2 = '#,##0.00',
	USE_GROUP_3 = '#,##0.000',
	USE_GROUP_4 = '#,##0.0000',
	USE_GROUP_5 = '#,##0.00000',
	USE_GROUP_6 = '#,##0.000000',


class SubjectDataSetColumnRenderer(ExtendedBaseModel):
	alignment: Optional[SubjectColumnAlignment] = None
	format: Optional[SubjectColumnFormat] = None
	highlightNegative: Optional[bool] = None


def construct_renderer(
		renderer: Optional[Union[dict, SubjectDataSetColumnRenderer]]) -> Optional[SubjectDataSetColumnRenderer]:
	if renderer is None:
		return None
	elif isinstance(renderer, SubjectDataSetColumnRenderer):
		return renderer
	else:
		return SubjectDataSetColumnRenderer(**renderer)


class SubjectDatasetColumn(ExtendedBaseModel):
	columnId: Optional[SubjectDatasetColumnId] = None
	parameter: Optional[Parameter] = []
	alias: Optional[str] = None
	arithmetic: Optional[SubjectColumnArithmetic] = None
	renderer: Optional[SubjectDataSetColumnRenderer] = None
	# recalculated column based on other columns
	# source of this column must be referred to other column, via columnId or alias
	# if column is declared as recalculate, arithmetic will be ignored
	# and refer to another recalculated column is not allowed
	recalculate: bool = False

	def __setattr__(self, name, value):
		if name == 'parameter':
			super().__setattr__(name, construct_parameter(value))
		elif name == 'renderer':
			super().__setattr__(name, construct_renderer(value))
		else:
			super().__setattr__(name, value)


def construct_column(column: Optional[Union[dict, SubjectDatasetColumn]]) -> Optional[SubjectDatasetColumn]:
	if column is None:
		return None
	elif isinstance(column, SubjectDatasetColumn):
		return column
	else:
		return SubjectDatasetColumn(**column)


def construct_columns(columns: Optional[list] = None) -> Optional[List[SubjectDatasetColumn]]:
	if columns is None:
		return None
	else:
		return ArrayHelper(columns).map(lambda x: construct_column(x)).to_list()


def construct_join(join: Optional[Union[dict, SubjectDatasetJoin]]) -> Optional[SubjectDatasetJoin]:
	if join is None:
		return None
	elif isinstance(join, SubjectDatasetJoin):
		return join
	else:
		return SubjectDatasetJoin(**join)


def construct_joins(joins: Optional[list] = None) -> Optional[List[SubjectDatasetJoin]]:
	if joins is None:
		return None
	else:
		return ArrayHelper(joins).map(lambda x: construct_join(x)).to_list()


class SubjectDataset(ExtendedBaseModel):
	columns: Optional[List[SubjectDatasetColumn]] = []
	joins: Optional[List[SubjectDatasetJoin]] = []
	filters: Optional[ParameterJoint] = None

	def __setattr__(self, name, value):
		if name == 'filters':
			super().__setattr__(name, construct_parameter_joint(value))
		elif name == 'columns':
			super().__setattr__(name, construct_columns(value))
		elif name == 'joins':
			super().__setattr__(name, construct_joins(value))
		else:
			super().__setattr__(name, value)


def construct_dataset(dataset: Optional[dict] = None) -> Optional[SubjectDataset]:
	if dataset is None:
		return None
	elif isinstance(dataset, SubjectDataset):
		return dataset
	else:
		return SubjectDataset(**dataset)


class Subject(UserBasedTuple, Auditable, LastVisit, ExtendedBaseModel):
	subjectId: Optional[SubjectId] = None
	name: Optional[str] = None
	connectId: Optional[ConnectedSpaceId] = None
	autoRefreshInterval: Optional[int] = 0
	dataset: Optional[SubjectDataset] = None

	def __setattr__(self, name, value):
		if name == 'dataset':
			super().__setattr__(name, construct_dataset(value))
		else:
			super().__setattr__(name, value)


class SubjectDatasetCriteriaIndicatorArithmetic(str, Enum):
	NONE = 'none'
	DISTINCT_COUNT = 'distinct_count'
	COUNT = 'count'
	SUMMARY = 'sum'
	AVERAGE = 'avg'
	MAXIMUM = 'max'
	MINIMUM = 'min'


class SubjectDatasetCriteriaIndicator(ExtendedBaseModel):
	name: Optional[str] = None
	columnId: Optional[str] = None
	arithmetic: Optional[SubjectDatasetCriteriaIndicatorArithmetic] = None
	alias: Optional[str] = None


def construct_criteria_indicator(
		indicator: Optional[Union[dict, SubjectDatasetCriteriaIndicator]]) -> Optional[SubjectDatasetCriteriaIndicator]:
	if indicator is None:
		return None
	elif isinstance(indicator, SubjectDatasetCriteriaIndicator):
		return indicator
	else:
		return SubjectDatasetCriteriaIndicator(**indicator)


def construct_criteria_indicators(indicators: Optional[list]) -> Optional[List[SubjectDatasetCriteriaIndicator]]:
	if indicators is None:
		return None
	return ArrayHelper(indicators).map(lambda x: construct_criteria_indicator(x)).to_list()


class SubjectDatasetCriteria(Pageable):
	# use one of subject id or name
	subjectId: Optional[SubjectId]
	subjectName: Optional[str]
	indicators: List[SubjectDatasetCriteriaIndicator]
	conditions: List[ParameterCondition]

	def __setattr__(self, name, value):
		if name == 'indicators':
			super().__setattr__(name, construct_criteria_indicators(value))
		elif name == 'conditions':
			super().__setattr__(name, construct_parameter_conditions(value))
		else:
			super().__setattr__(name, value)
