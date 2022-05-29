import {TopicSnapshotFrequency} from '@/services/data/admin/topic-snapshot';
import {Topic, TopicId} from '@/services/data/tuples/topic-types';
import {CheckBox} from '@/widgets/basic/checkbox';
import {ButtonInk, DropdownOption} from '@/widgets/basic/types';
import React, {useState} from 'react';
import {CriteriaState} from './types';
import {
	CriteriaContainer,
	CriteriaFrequencyContainer,
	CriteriaLabel,
	CriteriaSearchButton,
	CriteriaTopicDropdown
} from './widgets';

export const Criteria = (props: { topics: Array<Topic> }) => {
	const {topics} = props;

	const [state, setState] = useState<CriteriaState>({frequency: []});

	const onChange = (option: DropdownOption) => {
		setState(state => ({topicId: option.value as TopicId, frequency: state.frequency}));
	};
	const onFrequencyChange = (frequency: TopicSnapshotFrequency) => (value: boolean) => {
		if (value) {
			setState(state => ({topicId: state.topicId, frequency: [...state.frequency, frequency]}));
		} else {
			setState(state => ({topic: state.topicId, frequency: state.frequency.filter(f => f != frequency)}));
		}
	};
	const onFrequencyClicked = (frequency: TopicSnapshotFrequency) => () => {
		if (state.frequency.includes(frequency)) {
			setState(state => ({topic: state.topicId, frequency: state.frequency.filter(f => f != frequency)}));
		} else {
			setState(state => ({topicId: state.topicId, frequency: [...state.frequency, frequency]}));
		}
	};
	const onSearchClicked = () => {

	}

	const options = topics.map(topic => {
		return {
			value: topic.topicId,
			label: topic.name || 'Noname Topic'
		};
	}).sort((p1, p2) => {
		return (p1.label.toLowerCase()).localeCompare(p2.label.toLowerCase());
	});

	return <CriteriaContainer>
		<CriteriaLabel>Topic</CriteriaLabel>
		<CriteriaTopicDropdown value={state.topicId ?? null} options={options} onChange={onChange}
		                       please="To trigger pipelines"/>
		<CriteriaLabel>Catch Frequency</CriteriaLabel>
		<CriteriaFrequencyContainer>
			<CheckBox value={state.frequency.includes(TopicSnapshotFrequency.MONTHLY)}
			          onChange={onFrequencyChange(TopicSnapshotFrequency.MONTHLY)}/>
			<span onClick={onFrequencyClicked(TopicSnapshotFrequency.MONTHLY)}>Monthly</span>
			<CheckBox value={state.frequency.includes(TopicSnapshotFrequency.WEEKLY)}
			          onChange={onFrequencyChange(TopicSnapshotFrequency.WEEKLY)}/>
			<span onClick={onFrequencyClicked(TopicSnapshotFrequency.WEEKLY)}>Weekly</span>
			<CheckBox value={state.frequency.includes(TopicSnapshotFrequency.DAILY)}
			          onChange={onFrequencyChange(TopicSnapshotFrequency.DAILY)}/>
			<span onClick={onFrequencyClicked(TopicSnapshotFrequency.DAILY)}>Daily</span>
		</CriteriaFrequencyContainer>
		<span/>
		<CriteriaSearchButton ink={ButtonInk.PRIMARY} onClick={onSearchClicked}>
			Find
		</CriteriaSearchButton>
	</CriteriaContainer>;
};