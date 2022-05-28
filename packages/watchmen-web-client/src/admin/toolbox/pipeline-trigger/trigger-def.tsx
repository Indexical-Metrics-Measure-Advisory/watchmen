import {ParameterJointType} from '@/services/data/tuples/factor-calculator-types';
import {Topic, TopicId} from '@/services/data/tuples/topic-types';
import {ButtonInk, DropdownOption} from '@/widgets/basic/types';
import React, {useState} from 'react';
import {TopFilterEdit} from './top-filter-edit';
import {TriggerTopicFilter} from './types';
import {
	TopicDropdown,
	TriggerButton,
	TriggerButtonBar,
	TriggerContainer,
	TriggerFilterContainer,
	TriggerLabel
} from './widgets';

export const TriggerDef = (props: { topics: Array<Topic> }) => {
	const {topics} = props;

	const [trigger, setTrigger] = useState<Partial<TriggerTopicFilter>>({
		joint: {
			jointType: ParameterJointType.AND,
			filters: []
		}
	});

	const onChange = (option: DropdownOption) => {
		setTrigger(trigger => {
			return {
				...trigger,
				topicId: option.value as TopicId
			};
		});
	};

	const options = topics.map(topic => {
		return {
			value: topic.topicId,
			label: topic.name || 'Noname Topic'
		};
	});

	const topic = trigger.topicId == null ? null : topics.find(topic => topic.topicId == trigger.topicId);

	return <TriggerContainer>
		<TriggerLabel>Pick a topic</TriggerLabel>
		<TopicDropdown value={trigger.topicId ?? null} options={options} onChange={onChange}
		               please="To trigger pipelines"/>
		{topic != null
			? <>
				<TriggerLabel>Filter by</TriggerLabel>
				<TriggerFilterContainer>
					<TopFilterEdit topic={topic} filter={trigger as TriggerTopicFilter}/>
				</TriggerFilterContainer>
				<span/>
				<TriggerButtonBar>
					<TriggerButton ink={ButtonInk.INFO}>
						Fetch Row Count
					</TriggerButton>
					<TriggerButton ink={ButtonInk.PRIMARY}>
						Submit to Queue
					</TriggerButton>
				</TriggerButtonBar>
			</>
			: null}
	</TriggerContainer>;
};