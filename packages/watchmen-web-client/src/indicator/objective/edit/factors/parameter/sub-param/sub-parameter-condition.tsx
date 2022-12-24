import {Indicator} from '@/services/data/tuples/indicator-types';
import {
	ComputedObjectiveParameter,
	ConditionalObjectiveParameter,
	Objective,
	ObjectiveFactorOnIndicator,
	ObjectiveParameter
} from '@/services/data/tuples/objective-types';
import React from 'react';
import {isCaseThenParameter} from '../../../param-utils';
import {ConditionalEditor} from '../../conditional';
import {useParameterEventBus} from '../parameter-event-bus';
import {ParameterEventTypes} from '../parameter-event-bus-types';
import {SubParameterConditionContainer} from './widgets';

export const SubParameterCondition = (props: {
	objective: Objective; factor: ObjectiveFactorOnIndicator; indicator: Indicator;
	parent: ComputedObjectiveParameter; parameter: ObjectiveParameter;
}) => {
	const {objective, factor, indicator, parent, parameter} = props;

	const {fire} = useParameterEventBus();

	if (!isCaseThenParameter(parent)) {
		return null;
	}

	const onConditionChange = () => {
		fire(ParameterEventTypes.CONDITION_CHANGED, parameter);
	};

	return <SubParameterConditionContainer>
		<ConditionalEditor objective={objective} factor={factor} indicator={indicator}
		                   conditional={parameter as ConditionalObjectiveParameter}
		                   onChange={onConditionChange}/>
	</SubParameterConditionContainer>;
};