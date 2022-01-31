from enum import Enum
from typing import List

from watchmen_model.common import DataModel, FactorId, LastVisit, OptimisticLock, Parameter, ParameterJoint, ReportId, \
	SubjectDatasetColumnId, SubjectId, TopicId, UserBasedTuple


class SubjectJoinType(str, Enum):
	LEFT = 'left',
	RIGHT = 'right',
	INNER = 'inner',


class SubjectDatasetJoin(DataModel):
	topicId: TopicId = None
	factorId: FactorId = None
	secondaryTopicId: TopicId = None
	secondaryFactorId: FactorId = None
	type: SubjectJoinType = SubjectJoinType.INNER


class SubjectDatasetColumn(DataModel):
	columnId: SubjectDatasetColumnId = None
	parameter: Parameter
	alias: str = None


class SubjectDataset(DataModel):
	filters: ParameterJoint
	columns: List[SubjectDatasetColumn] = []
	joins: List[SubjectDatasetJoin] = []


class Subject(UserBasedTuple, OptimisticLock, LastVisit):
	subjectId: SubjectId = None
	name: str = None
	reportIds: List[ReportId] = []
	dataset: SubjectDataset = None
