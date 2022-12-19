import {
	ComputedObjectiveParameter,
	ObjectiveFormulaOperator,
	ObjectiveParameter
} from '@/services/data/tuples/objective-types';
import React from 'react';
import {SubParameterConditionContainer} from './widgets';

export const SubParameterCondition = (props: { parent: ComputedObjectiveParameter; parameter: ObjectiveParameter }) => {
	const {parent} = props;

	// const {fire} = useParameterEventBus();

	if (parent.operator !== ObjectiveFormulaOperator.CASE_THEN) {
		return null;
	}

	// const onConditionChange = () => {
	// 	fire(ParameterEventTypes.CONDITION_CHANGED, parameter);
	// };

	return <SubParameterConditionContainer>
		{/*<ConditionalEditor conditional={parameter as Conditional} topics={topics} onChange={onConditionChange}/>*/}
	</SubParameterConditionContainer>;
};