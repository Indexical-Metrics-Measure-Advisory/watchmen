import {Topic} from '@/services/data/tuples/topic-types';
import {SingleTopicFilter} from '@/widgets/single-topic-filter';
import {FilterEventBusProvider} from '@/widgets/single-topic-filter/filter-event-bus';
import React from 'react';
import {TriggerTopicFilter} from './types';

const TopFilter = (props: { filter: TriggerTopicFilter; topic: Topic; }) => {
	const {filter, topic} = props;

	return <SingleTopicFilter joint={filter.joint} topic={topic}/>;
};

export const TopFilterEdit = (props: { filter: TriggerTopicFilter; topic: Topic; }) => {
	const {filter, topic} = props;

	return <FilterEventBusProvider>
		<TopFilter filter={filter} topic={topic}/>
	</FilterEventBusProvider>;
};