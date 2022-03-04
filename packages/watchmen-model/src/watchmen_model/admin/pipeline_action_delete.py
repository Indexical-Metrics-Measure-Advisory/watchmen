from watchmen_model.common import construct_parameter_joint
from .pipeline_action import DeleteTopicActionType, FindBy, ToTopic


class DeleteTopicAction(ToTopic, FindBy):
	type: DeleteTopicActionType = None

	def __setattr__(self, name, value):
		if name == 'by':
			super().__setattr__(name, construct_parameter_joint(value))
		else:
			super().__setattr__(name, value)


class DeleteRowAction(DeleteTopicAction):
	type: DeleteTopicActionType = DeleteTopicActionType.DELETE_ROW


class DeleteRowsAction(DeleteTopicAction):
	type: DeleteTopicActionType = DeleteTopicActionType.DELETE_ROWS
