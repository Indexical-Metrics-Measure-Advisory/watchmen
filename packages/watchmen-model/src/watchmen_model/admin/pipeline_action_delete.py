from .pipeline_action import DeleteTopicActionType, FindBy, ToTopic


class DeleteTopicAction(ToTopic, FindBy):
	type: DeleteTopicActionType = None


class DeleteRowAction(DeleteTopicAction):
	type: DeleteTopicActionType = DeleteTopicActionType.DELETE_ROW


class DeleteRowsAction(DeleteTopicAction):
	type: DeleteTopicActionType = DeleteTopicActionType.DELETE_ROWS
