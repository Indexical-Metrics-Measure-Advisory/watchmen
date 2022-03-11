import {DeleteTopicActionType, FindBy, PipelineStageUnitAction, ToTopic} from './pipeline-stage-unit-action-types';

export interface DeleteTopicAction extends ToTopic, FindBy, PipelineStageUnitAction {
	type: DeleteTopicActionType;
}

export interface DeleteRowAction extends DeleteTopicAction {
	type: DeleteTopicActionType.DELETE_ROW;
}

export interface DeleteRowsAction extends DeleteTopicAction {
	type: DeleteTopicActionType.DELETE_ROWS;
}
