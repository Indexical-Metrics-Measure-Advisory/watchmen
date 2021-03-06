import {SpaceFilter} from '@/services/data/tuples/space-types';
import {Topic} from '@/services/data/tuples/topic-types';
import {SingleTopicFilter} from '@/widgets/single-topic-filter';
import {FilterEventBusProvider, useFilterEventBus} from '@/widgets/single-topic-filter/filter-event-bus';
import {FilterEventTypes} from '@/widgets/single-topic-filter/filter-event-bus-types';
import {useTupleEventBus} from '@/widgets/tuple-workbench/tuple-event-bus';
import {TupleEventTypes, TupleState} from '@/widgets/tuple-workbench/tuple-event-bus-types';
import React, {useEffect} from 'react';

const TopFilter = (props: { filter: SpaceFilter; topic: Topic; }) => {
	const {filter, topic} = props;

	const {fire: fireTuple} = useTupleEventBus();
	const {on, off} = useFilterEventBus();
	useEffect(() => {
		const onChanged = () => {
			fireTuple(TupleEventTypes.CHANGE_TUPLE_STATE, TupleState.CHANGED);
		};

		on(FilterEventTypes.JOINT_TYPE_CHANGED, onChanged);
		on(FilterEventTypes.FILTER_ADDED, onChanged);
		on(FilterEventTypes.FILTER_REMOVED, onChanged);
		on(FilterEventTypes.CONTENT_CHANGED, onChanged);
		return () => {
			off(FilterEventTypes.JOINT_TYPE_CHANGED, onChanged);
			off(FilterEventTypes.FILTER_ADDED, onChanged);
			off(FilterEventTypes.FILTER_REMOVED, onChanged);
			off(FilterEventTypes.CONTENT_CHANGED, onChanged);
		};
	}, [on, off, fireTuple, filter]);

	return <SingleTopicFilter joint={filter.joint} topic={topic}/>;
};

export const TopFilterEdit = (props: { filter: SpaceFilter; topic: Topic; }) => {
	const {filter, topic} = props;

	return <FilterEventBusProvider>
		<TopFilter filter={filter} topic={topic}/>
	</FilterEventBusProvider>;
};