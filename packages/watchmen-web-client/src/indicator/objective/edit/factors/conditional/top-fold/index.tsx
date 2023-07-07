import {ConditionalObjectiveParameter, ObjectiveFactorOnIndicator} from '@/services/data/tuples/objective-types';
import {useForceUpdate} from '@/widgets/basic/utils';
import React, {useEffect} from 'react';
import {useFilterEventBus} from '../filter-event-bus';
import {FilterEventTypes} from '../filter-event-bus-types';
import {JointFold} from '../joint-fold';

export const TopFold = (props: {
	factor: ObjectiveFactorOnIndicator;
	conditional?: ConditionalObjectiveParameter;
}) => {
	const {factor, conditional} = props;

	const {on, off} = useFilterEventBus();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		on(FilterEventTypes.TOP_TYPE_CHANGED, forceUpdate);
		return () => {
			off(FilterEventTypes.TOP_TYPE_CHANGED, forceUpdate);
		};
	}, [on, off, forceUpdate]);

	// noinspection PointlessBooleanExpressionJS
	const should = conditional == null ? (!!factor.conditional) : true;
	if (!should) {
		return null;
	}

	return <JointFold/>;
};