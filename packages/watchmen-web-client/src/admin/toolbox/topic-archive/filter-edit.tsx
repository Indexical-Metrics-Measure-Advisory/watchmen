import {ParameterJointType} from '@/services/data/tuples/factor-calculator-types';
import {TopicArchivePolicy} from '@/services/data/tuples/topic-archive-types';
import {Topic} from '@/services/data/tuples/topic-types';
import {SingleTopicFilter} from '@/widgets/single-topic-filter';
import {FilterEventBusProvider} from '@/widgets/single-topic-filter/filter-event-bus';
import React from 'react';

const PolicyFilter = (props: { policy: TopicArchivePolicy; topic: Topic; }) => {
	const {policy, topic} = props;

	if (policy.filter == null) {
		policy.filter = {
			jointType: ParameterJointType.AND,
			filters: []
		};
	}

	return <SingleTopicFilter joint={policy.filter} topic={topic}/>;
};

export const PolicyFilterEdit = (props: { policy: TopicArchivePolicy; topic: Topic; }) => {
	const {policy, topic} = props;

	return <FilterEventBusProvider>
		<PolicyFilter policy={policy} topic={topic}/>
	</FilterEventBusProvider>;
};
