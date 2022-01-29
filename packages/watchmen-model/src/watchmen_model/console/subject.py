from enum import Enum
from typing import List

from pydantic import BaseModel

from watchmen_model.common import FactorId, LastVisit, OptimisticLock, Parameter, ParameterJoint, ReportId, \
	SubjectDatasetColumnId, SubjectId, TopicId, UserBasedTuple


class SubjectJoinType(str, Enum):
	LEFT = 'left',
	RIGHT = 'right',
	INNER = 'inner',


class SubjectDatasetJoin(BaseModel):
	topicId: TopicId = None
	factorId: FactorId = None
	secondaryTopicId: TopicId = None
	secondaryFactorId: FactorId = None
	type: SubjectJoinType = SubjectJoinType.INNER


class SubjectDatasetColumn(BaseModel):
	columnId: SubjectDatasetColumnId = None
	parameter: Parameter
	alias: str = None


class SubjectDataset(BaseModel):
	filters: ParameterJoint
	columns: List[SubjectDatasetColumn] = []
	joins: List[SubjectDatasetJoin] = []


class Subject(UserBasedTuple, OptimisticLock, LastVisit):
	subjectId: SubjectId = None
	name: str = None
	reportIds: List[ReportId] = []
	dataset: SubjectDataset = None
