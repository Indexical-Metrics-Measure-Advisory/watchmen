import {Inspection} from '@/services/data/tuples/inspection-types';
import {SubjectForIndicator, TopicForIndicator} from '@/services/data/tuples/query-indicator-types';
import {Fragment} from 'react';
import {FilterOnSubject} from './filter-on-subject';
import {FilterOnTopic} from './filter-on-topic';

export const TimePeriodFilterSelector = (props: {
	inspection: Inspection;
	topic?: TopicForIndicator;
	subject?: SubjectForIndicator;
	valueChanged: () => void
}) => {
	const {inspection, topic, subject, valueChanged} = props;

	if (topic != null) {
		return <FilterOnTopic inspection={inspection} topic={topic} valueChanged={valueChanged}/>;
	} else if (subject != null) {
		return <FilterOnSubject inspection={inspection} subject={subject} valueChanged={valueChanged}/>;
	} else {
		return <Fragment/>;
	}
};