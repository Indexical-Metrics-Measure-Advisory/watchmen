import {ParameterJointType} from '@/services/data/tuples/factor-calculator-types';
import {Pipeline, PipelineId} from '@/services/data/tuples/pipeline-types';
import {Topic, TopicId} from '@/services/data/tuples/topic-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {ButtonInk, DropdownOption} from '@/widgets/basic/types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import React, {useState} from 'react';
import {usePipelineTriggerEventBus} from './pipeline-trigger-event-bus';
import {PipelineTriggerEventTypes} from './pipeline-trigger-event-bus-types';
import {TopFilterEdit} from './top-filter-edit';
import {TriggerTopicFilter} from './types';
import {
	TopicDropdown,
	TriggerButton,
	TriggerContainer,
	TriggerFilterContainer,
	TriggerLabel,
	TriggerPipeline,
	TriggerPipelinesContainer,
	TriggerText
} from './widgets';

export const TriggerDef = (props: { topics: Array<Topic>, pipelines: Array<Pipeline> }) => {
	const {topics, pipelines} = props;

	const {fire: fireGlobal} = useEventBus();
	const {fire} = usePipelineTriggerEventBus();
	const [trigger, setTrigger] = useState<Partial<TriggerTopicFilter>>({
		joint: {
			jointType: ParameterJointType.AND,
			filters: []
		},
		pipelineIds: []
	});

	const onChange = (option: DropdownOption) => {
		setTrigger(trigger => {
			return {
				...trigger,
				topicId: option.value as TopicId
			};
		});
	};
	const onPipelineClicked = (pipelineId: PipelineId) => () => {
		if (trigger.pipelineIds?.includes(pipelineId)) {
			setTrigger(trigger => {
				return {
					// eslint-disable-next-line
					...trigger, pipelineIds: (trigger.pipelineIds || []).filter(selected => selected != pipelineId)
				};
			});
		} else {
			setTrigger(trigger => {
				return {
					...trigger, pipelineIds: [...(trigger.pipelineIds || []), pipelineId]
				};
			});
		}
	};
	const onSubmitToQueueClicked = () => {
		if (trigger.topicId == null) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Please pick a topic first.</AlertLabel>);
			return;
		}
		if (trigger.pipelineIds == null || trigger.pipelineIds.length === 0) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Please pick at least one pipeline.</AlertLabel>);
			return;
		}
		fire(PipelineTriggerEventTypes.TRIGGER_ADDED, trigger as TriggerTopicFilter);
		setTrigger({
			joint: {
				jointType: ParameterJointType.AND,
				filters: []
			},
			pipelineIds: []
		});
	};

	const options = topics.map(topic => {
		return {
			value: topic.topicId,
			label: topic.name || 'Noname Topic'
		};
	});

	// eslint-disable-next-line
	const topic = trigger.topicId == null ? null : topics.find(topic => topic.topicId == trigger.topicId);
	const availablePipelines = pipelines
		// eslint-disable-next-line
		.filter(pipeline => pipeline.topicId == trigger.topicId)
		.sort((p1, p2) => {
			return (p1.name || '').localeCompare(p2.name || '');
		});

	return <TriggerContainer>
		<TriggerLabel>Pick a topic</TriggerLabel>
		<TopicDropdown value={trigger.topicId ?? null} options={options} onChange={onChange}
		               please="To trigger pipelines"/>
		{topic != null
			? <>
				<TriggerLabel>Pipelines</TriggerLabel>
				<TriggerPipelinesContainer>
					{availablePipelines.length === 0
						? <TriggerText>No available pipelines.</TriggerText>
						: availablePipelines.map(pipeline => {
							return <TriggerPipeline key={pipeline.pipelineId}
							                        selected={trigger.pipelineIds?.includes(pipeline.pipelineId) ?? false}
							                        onClick={onPipelineClicked(pipeline.pipelineId)}>
								{pipeline.name || 'Noname Pipeline'}
							</TriggerPipeline>;
						})
					}
				</TriggerPipelinesContainer>
				<TriggerLabel>Filter by</TriggerLabel>
				<TriggerFilterContainer>
					<TopFilterEdit topic={topic} filter={trigger as TriggerTopicFilter}/>
				</TriggerFilterContainer>
			</>
			: null}
		<span/>
		<TriggerButton ink={ButtonInk.PRIMARY} onClick={onSubmitToQueueClicked}>
			Submit to Queue
		</TriggerButton>
	</TriggerContainer>;
};