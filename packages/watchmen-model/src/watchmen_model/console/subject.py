from enum import Enum
from typing import List

from pydantic import BaseModel

from watchmen_model.common import Auditable, DataModel, FactorId, LastVisit, Parameter, ParameterJoint, ReportId, \
	SubjectDatasetColumnId, SubjectId, TopicId, UserBasedTuple


class SubjectJoinType(str, Enum):
	LEFT = 'left',
	RIGHT = 'right',
	INNER = 'inner',


class SubjectDatasetJoin(DataModel, BaseModel):
	topicId: TopicId = None
	factorId: FactorId = None
	secondaryTopicId: TopicId = None
	secondaryFactorId: FactorId = None
	type: SubjectJoinType = SubjectJoinType.INNER


class SubjectDatasetColumn(DataModel, BaseModel):
	columnId: SubjectDatasetColumnId = None
	parameter: Parameter
	alias: str = None


class SubjectDataset(DataModel, BaseModel):
	filters: ParameterJoint
	columns: List[SubjectDatasetColumn] = []
	joins: List[SubjectDatasetJoin] = []


class Subject(UserBasedTuple, Auditable, LastVisit, BaseModel):
	subjectId: SubjectId = None
	name: str = None
	reportIds: List[ReportId] = []
	autoRefreshInterval: int = 0
	dataset: SubjectDataset = None
