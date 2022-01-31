from .pipeline_action import AggregateArithmeticHolder, FindBy, FromFactor, FromTopic, \
	MemoryWriter, ReadTopicActionType


class ReadTopicAction(FromTopic, MemoryWriter, FindBy):
	type: ReadTopicActionType


class ReadRowAction(ReadTopicAction):
	type: ReadTopicActionType.READ_ROW = ReadTopicActionType.READ_ROW


class ReadRowsAction(ReadTopicAction):
	type: ReadTopicActionType.READ_ROWS = ReadTopicActionType.READ_ROWS


class ReadFactorAction(FromFactor, ReadTopicAction, AggregateArithmeticHolder):
	type: ReadTopicActionType.READ_FACTOR = ReadTopicActionType.READ_FACTOR


class ReadFactorsAction(FromFactor, ReadTopicAction):
	type: ReadTopicActionType.READ_FACTORS = ReadTopicActionType.READ_FACTORS


class ExistsAction(ReadTopicAction):
	type: ReadTopicActionType.EXISTS = ReadTopicActionType.EXISTS
