import {Objective, ObjectiveVariableOnValue} from '@/services/data/tuples/objective-types';
import {noop} from '@/services/utils';
import {Input} from '@/widgets/basic/input';
import {useForceUpdate} from '@/widgets/basic/utils';
import React, {ChangeEvent} from 'react';
import {useObjectiveEventBus} from '../../objective-event-bus';
import {ObjectiveEventTypes} from '../../objective-event-bus-types';

export const ValueVariableEditor = (props: { objective: Objective; variable: ObjectiveVariableOnValue }) => {
	const {variable} = props;

	const {fire} = useObjectiveEventBus();
	const forceUpdate = useForceUpdate();

	const onValueChanged = (event: ChangeEvent<HTMLInputElement>) => {
		variable.value = event.target.value;
		fire(ObjectiveEventTypes.SAVE, noop);
		forceUpdate();
	};

	return <Input value={variable.value ?? ''} onChange={onValueChanged}/>;
};