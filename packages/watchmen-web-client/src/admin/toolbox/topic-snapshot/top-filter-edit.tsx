import {ParameterJointType} from '@/services/data/tuples/factor-calculator-types';
import {TopicSnapshotScheduler} from '@/services/data/tuples/topic-snapshot-types';
import {Topic} from '@/services/data/tuples/topic-types';
import {SingleTopicFilter} from '@/widgets/single-topic-filter';
import {FilterEventBusProvider} from '@/widgets/single-topic-filter/filter-event-bus';
import React from 'react';

const TopFilter = (props: { scheduler: TopicSnapshotScheduler; topic: Topic; }) => {
	const {scheduler, topic} = props;

	if (scheduler.filter == null) {
		scheduler.filter = {
			jointType: ParameterJointType.AND,
			filters: []
		};
	}

	return <SingleTopicFilter joint={scheduler.filter} topic={topic}/>;
};

export const TopFilterEdit = (props: { scheduler: TopicSnapshotScheduler; topic: Topic; }) => {
	const {scheduler, topic} = props;

	return <FilterEventBusProvider>
		<TopFilter scheduler={scheduler} topic={topic}/>
	</FilterEventBusProvider>;
};