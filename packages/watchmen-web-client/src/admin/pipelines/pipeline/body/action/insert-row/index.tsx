import {ParameterKind} from '@/services/data/tuples/factor-calculator-types';
import {FactorId} from '@/services/data/tuples/factor-types';
import {PipelineStage} from '@/services/data/tuples/pipeline-stage-types';
import {AggregateArithmetic} from '@/services/data/tuples/pipeline-stage-unit-action/aggregate-arithmetic-types';
import {
	PipelineStageUnitAction
} from '@/services/data/tuples/pipeline-stage-unit-action/pipeline-stage-unit-action-types';
import {isInsertRowAction} from '@/services/data/tuples/pipeline-stage-unit-action/pipeline-stage-unit-action-utils';
import {MappingFactor} from '@/services/data/tuples/pipeline-stage-unit-action/write-topic-actions-types';
import {PipelineStageUnit} from '@/services/data/tuples/pipeline-stage-unit-types';
import {Pipeline} from '@/services/data/tuples/pipeline-types';
import {Topic} from '@/services/data/tuples/topic-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {useForceUpdate} from '@/widgets/basic/utils';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import React from 'react';
import {useActionType} from '../action-effect/use-action-type';
import {FactorsMapping} from '../factors-mapping';
import {TopicPicker} from '../topic-picker';
import {ActionLeadLabelThin} from '../widgets';

export const InsertRow = (props: {
	pipeline: Pipeline;
	stage: PipelineStage;
	unit: PipelineStageUnit;
	action: PipelineStageUnitAction;
	topics: Array<Topic>;
	triggerTopic: Topic;
}) => {
	const {action, topics, triggerTopic} = props;

	const {fire: fireGlobal} = useEventBus();
	useActionType(action);
	const forceUpdate = useForceUpdate();

	if (!isInsertRowAction(action)) {
		return null;
	}

	const onPrefillClicked = () => {
		const topicId = action.topicId;
		if (topicId == null) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Pick target topic first.</AlertLabel>);
			return;
		}
		// eslint-disable-next-line
		const topic = topics.find(topic => topic.topicId == topicId);
		if (topic == null) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Topic not found according to current selection.</AlertLabel>);
			return;
		}

		const mapping = action.mapping || [];
		const existing = mapping.reduce((map, mapping) => {
			if (mapping.factorId != null) {
				map[mapping.factorId] = mapping;
			}
			return map;
		}, {} as Record<FactorId, MappingFactor>);
		let added = false;
		(topic.factors || []).forEach(factor => {
			if (existing[factor.factorId] == null) {
				added = true;
				mapping.push({
					arithmetic: AggregateArithmetic.NONE,
					source: {kind: ParameterKind.TOPIC},
					factorId: factor.factorId
				});
			}
		});
		if (added) {
			forceUpdate();
		} else {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>All factors are added into mapping already.</AlertLabel>);
		}
	};

	return <>
		<ActionLeadLabelThin>Target Topic:</ActionLeadLabelThin>
		<TopicPicker action={action} topics={topics} prefillMappingFactors={onPrefillClicked} synonymAllowed={false}/>
		<ActionLeadLabelThin>Use Mapping:</ActionLeadLabelThin>
		<FactorsMapping action={action} topics={topics} topic={triggerTopic}/>
	</>;
};