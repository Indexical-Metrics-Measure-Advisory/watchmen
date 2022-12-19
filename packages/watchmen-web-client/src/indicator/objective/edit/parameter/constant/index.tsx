import {Objective, ObjectiveParameter} from '@/services/data/tuples/objective-types';
import {useForceUpdate} from '@/widgets/basic/utils';
import React, {ChangeEvent} from 'react';
import {useParameterEventBus} from '../parameter-event-bus';
import {ParameterEventTypes} from '../parameter-event-bus-types';
import {useParameterFromChanged} from '../use-parameter-from-changed';
import {isConstantParameter} from '../utils';
import {ConstantContainer, ConstantInput} from './widgets';

export const ConstantEditor = (props: { objective: Objective; parameter: ObjectiveParameter }) => {
	const {parameter} = props;

	const {fire} = useParameterEventBus();
	useParameterFromChanged();
	const forceUpdate = useForceUpdate();

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
		forceUpdate();
	};

	return <ConstantContainer>
		<ConstantInput value={parameter.value || ''} onChange={onValueChange}/>
	</ConstantContainer>;
};
