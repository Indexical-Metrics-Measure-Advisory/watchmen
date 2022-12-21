import {
	ComputedObjectiveParameter,
	ConditionalObjectiveParameter,
	Objective,
	ObjectiveFactor,
	ObjectiveParameter
} from '@/services/data/tuples/objective-types';
import React from 'react';
import {ConditionalEditor} from '../conditional';
import {useParameterEventBus} from '../parameter-event-bus';
import {ParameterEventTypes} from '../parameter-event-bus-types';
import {isCaseThenParameter} from '../utils';
import {SubParameterConditionContainer} from './widgets';

export const SubParameterCondition = (props: {
	objective: Objective; parent: ComputedObjectiveParameter; parameter: ObjectiveParameter;
	factors: Array<ObjectiveFactor>;
}) => {
	const {objective, parent, parameter, factors} = props;

	const {fire} = useParameterEventBus();

	if (!isCaseThenParameter(parent)) {
		return null;
	}

	const onConditionChange = () => {
		fire(ParameterEventTypes.CONDITION_CHANGED, parameter);
	};

	return <SubParameterConditionContainer>
		<ConditionalEditor objective={objective}
		                   conditional={parameter as ConditionalObjectiveParameter} onChange={onConditionChange}
		                   factors={factors}/>
	</SubParameterConditionContainer>;
};