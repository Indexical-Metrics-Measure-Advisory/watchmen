from enum import Enum
from typing import Union, Optional

from watchmen_utilities import ExtendedBaseModel

from watchmen_model.common import FactorId, ParameterJoint, PipelineActionId, TopicId


class SystemActionType(str, Enum):
	ALARM = 'alarm',
	COPY_TO_MEMORY = 'copy-to-memory',
	WRITE_TO_EXTERNAL = 'write-to-external'


class ReadTopicActionType(str, Enum):
	READ_ROW = 'read-row',
	READ_FACTOR = 'read-factor',
	EXISTS = 'exists',
	READ_ROWS = 'read-rows',
	READ_FACTORS = 'read-factors'


class WriteTopicActionType(str, Enum):
	MERGE_ROW = 'merge-row',
	INSERT_ROW = 'insert-row',
	INSERT_OR_MERGE_ROW = 'insert-or-merge-row',
	WRITE_FACTOR = 'write-factor'


class DeleteTopicActionType(str, Enum):
	DELETE_ROW = 'delete-row',
	DELETE_ROWS = 'delete-rows'


PipelineActionType = Union[WriteTopicActionType, ReadTopicActionType, DeleteTopicActionType, SystemActionType]


class PipelineAction(ExtendedBaseModel):
	actionId: Optional[PipelineActionId] = None
	type: Optional[PipelineActionType] = None


class MemoryWriter(PipelineAction):
	variableName: Optional[str] = None


class FromTopic(PipelineAction):
	topicId: Optional[TopicId] = None


class FromFactor(FromTopic):
	factorId: Optional[FactorId] = None


class ToTopic(PipelineAction):
	topicId: Optional[TopicId] = None


class ToFactor(ToTopic):
	factorId: Optional[FactorId] = None


class FindBy(PipelineAction):
	by: Optional[ParameterJoint] = None


class AggregateArithmetic(str, Enum):
	NONE = 'none',
	COUNT = 'count',
	SUM = 'sum',
	AVG = 'avg'


class AggregateArithmeticHolder(ExtendedBaseModel):
	arithmetic: Optional[AggregateArithmetic] = None
