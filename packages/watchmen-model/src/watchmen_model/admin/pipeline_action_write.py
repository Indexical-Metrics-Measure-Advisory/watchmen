from typing import List, Union

from watchmen_model.common import FactorId, Parameter
from .pipeline_action import AggregateArithmeticHolder, FindBy, PipelineAction, ToFactor, ToTopic, \
	WriteTopicActionType


class MappingFactor(AggregateArithmeticHolder):
	source: Parameter = None
	factorId: FactorId = None


class MappingRow(PipelineAction):
	mapping: List[MappingFactor] = []


class WriteTopicAction(ToTopic):
	type: WriteTopicActionType = None


class InsertRowAction(WriteTopicAction, MappingRow):
	type: WriteTopicActionType.INSERT_ROW = WriteTopicActionType.INSERT_ROW


class MergeRowAction(WriteTopicAction, MappingRow, FindBy):
	type: Union[WriteTopicActionType.MERGE_ROW, WriteTopicActionType.INSERT_OR_MERGE_ROW] = None


class WriteFactorAction(ToFactor, WriteTopicAction, FindBy, AggregateArithmeticHolder):
	type: WriteTopicActionType.WRITE_FACTOR = WriteTopicActionType.WRITE_FACTOR
	source: Parameter = None
