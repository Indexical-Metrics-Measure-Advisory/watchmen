import {Indicator} from '@/services/data/tuples/indicator-types';
import {
	ConditionalObjectiveParameter,
	Objective,
	ObjectiveFactorOnIndicator
} from '@/services/data/tuples/objective-types';
import {useForceUpdate} from '@/widgets/basic/utils';
import React, {useEffect} from 'react';
import {useFilterEventBus} from '../filter-event-bus';
import {FilterEventTypes} from '../filter-event-bus-types';
import {JointBody} from '../joint-body';
import {JointElements} from '../joint-elements';
import {JointOperators} from '../joint-operators';

export const TopJoint = (props: {
	objective: Objective; factor: ObjectiveFactorOnIndicator; indicator: Indicator;
	conditional?: ConditionalObjectiveParameter;
}) => {
	const {objective, factor, indicator, conditional} = props;

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

	const joint = conditional == null ? factor.filter! : conditional.on;

	return <JointBody>
		<JointElements objective={objective} factor={factor} indicator={indicator} joint={joint}/>
		<JointOperators joint={factor.filter!}/>
	</JointBody>;
};