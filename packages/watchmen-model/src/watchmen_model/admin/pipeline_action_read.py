from watchmen_model.common import construct_parameter_joint
from .pipeline_action import AggregateArithmeticHolder, FindBy, FromFactor, FromTopic, MemoryWriter, ReadTopicActionType


class ReadTopicAction(FromTopic, MemoryWriter, FindBy):
	type: ReadTopicActionType

	def __setattr__(self, name, value):
		if name == 'by':
			super().__setattr__(name, construct_parameter_joint(value))
		else:
			super().__setattr__(name, value)


class ReadRowAction(ReadTopicAction):
	type: ReadTopicActionType = ReadTopicActionType.READ_ROW


class ReadRowsAction(ReadTopicAction):
	type: ReadTopicActionType = ReadTopicActionType.READ_ROWS


class ReadFactorAction(FromFactor, ReadTopicAction, AggregateArithmeticHolder):
	type: ReadTopicActionType = ReadTopicActionType.READ_FACTOR


class ReadFactorsAction(FromFactor, ReadTopicAction):
	type: ReadTopicActionType = ReadTopicActionType.READ_FACTORS


class ExistsAction(ReadTopicAction):
	type: ReadTopicActionType = ReadTopicActionType.EXISTS
