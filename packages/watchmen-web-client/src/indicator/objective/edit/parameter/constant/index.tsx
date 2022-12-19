import {useParameterFromChanged} from '@/indicator/objective/edit/parameter/use-parameter-from-changed';
import {Objective, ObjectiveParameter} from '@/services/data/tuples/objective-types';
import React, {ChangeEvent} from 'react';
import {useParameterEventBus} from '../parameter-event-bus';
import {ParameterEventTypes} from '../parameter-event-bus-types';
import {isConstantParameter} from '../utils';
import {ConstantContainer, ConstantInput} from './widgets';

export const ConstantEditor = (props: { objective: Objective; parameter: ObjectiveParameter }) => {
	const {parameter} = props;

	const {fire} = useParameterEventBus();
	useParameterFromChanged();

	if (!isConstantParameter(parameter)) {
		return null;
	}

	const onValueChange = (event: ChangeEvent<HTMLInputElement>) => {
		const {value} = event.target;
		if (value === parameter.value) {
			return;
		}
		parameter.value = value;
		fire(ParameterEventTypes.CONSTANT_VALUE_CHANGED, parameter);
	};

	return <ConstantContainer>
		<ConstantInput value={parameter.value || ''} onChange={onValueChange}/>
	</ConstantContainer>;
};
