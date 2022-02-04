from typing import List

from pydantic import BaseModel

from watchmen_model.common import FactorId, Parameter
from .pipeline_action import AggregateArithmeticHolder, FindBy, PipelineAction, ToFactor, ToTopic, \
	WriteTopicActionType


class MappingFactor(AggregateArithmeticHolder, BaseModel):
	source: Parameter = None
	factorId: FactorId = None


class MappingRow(PipelineAction):
	mapping: List[MappingFactor] = []


class WriteTopicAction(ToTopic):
	type: WriteTopicActionType = None


class InsertRowAction(WriteTopicAction, MappingRow):
	type: WriteTopicActionType = WriteTopicActionType.INSERT_ROW


class InsertOrMergeRowAction(WriteTopicAction, MappingRow, FindBy):
	type: WriteTopicActionType = WriteTopicActionType.INSERT_OR_MERGE_ROW


class MergeRowAction(WriteTopicAction, MappingRow, FindBy):
	type: WriteTopicActionType = WriteTopicActionType.MERGE_ROW


class WriteFactorAction(ToFactor, WriteTopicAction, FindBy, AggregateArithmeticHolder):
	type: WriteTopicActionType = WriteTopicActionType.WRITE_FACTOR
	source: Parameter = None
