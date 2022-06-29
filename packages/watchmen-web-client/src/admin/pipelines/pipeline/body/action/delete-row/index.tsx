import {PipelineStage} from '@/services/data/tuples/pipeline-stage-types';
import {
	PipelineStageUnitAction
} from '@/services/data/tuples/pipeline-stage-unit-action/pipeline-stage-unit-action-types';
import {isDeleteRowAction} from '@/services/data/tuples/pipeline-stage-unit-action/pipeline-stage-unit-action-utils';
import {PipelineStageUnit} from '@/services/data/tuples/pipeline-stage-unit-types';
import {Pipeline} from '@/services/data/tuples/pipeline-types';
import {Topic} from '@/services/data/tuples/topic-types';
import React from 'react';
import {useActionType} from '../action-effect/use-action-type';
import {FindByCondition} from '../find-by';
import {TopicPicker} from '../topic-picker';
import {ActionLeadLabelThin} from '../widgets';

export const DeleteRow = (props: {
	pipeline: Pipeline;
	stage: PipelineStage;
	unit: PipelineStageUnit;
	action: PipelineStageUnitAction;
	topics: Array<Topic>;
	triggerTopic: Topic;
}) => {
	const {action, topics, triggerTopic} = props;

	useActionType(action);

	if (!isDeleteRowAction(action)) {
		return null;
	}

	return <>
		<ActionLeadLabelThin>Source Topic:</ActionLeadLabelThin>
		<TopicPicker action={action} topics={topics} synonymAllowed={false}/>
		<ActionLeadLabelThin>By:</ActionLeadLabelThin>
		<FindByCondition action={action} topics={topics} topic={triggerTopic}/>
	</>;
};