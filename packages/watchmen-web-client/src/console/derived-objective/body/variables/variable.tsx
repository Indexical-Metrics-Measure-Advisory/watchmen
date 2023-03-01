import {Objective, ObjectiveVariable} from '@/services/data/tuples/objective-types';
import {isValueVariable} from '@/services/data/tuples/objective-utils';
import {noop} from '@/services/utils';
import {Input} from '@/widgets/basic/input';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import React, {ChangeEvent} from 'react';
import {useObjectiveEventBus} from '../../objective-event-bus';
import {ObjectiveEventTypes} from '../../objective-event-bus-types';
import {VariableName} from './widgets';

const ValueVariableEditor = (props: { objective: Objective; variable: ObjectiveVariable }) => {
	const {variable} = props;

	const {fire} = useObjectiveEventBus();
	const forceUpdate = useForceUpdate();

	if (!isValueVariable(variable)) {
		return null;
	}

	const onValueChanged = (event: ChangeEvent<HTMLInputElement>) => {
		variable.value = event.target.value;
		fire(ObjectiveEventTypes.SAVE, noop);
		forceUpdate();
	};

	return <Input value={variable.value ?? ''} onChange={onValueChanged}/>;
};

export const Variable = (props: { objective: Objective; variable: ObjectiveVariable; index: number }) => {
	const {objective, variable} = props;

	return <>
		<VariableName>{variable.name || Lang.CONSOLE.DERIVED_OBJECTIVE.UNKNOWN_VARIABLE_NAME}</VariableName>
		<ValueVariableEditor objective={objective} variable={variable}/>
	</>;
};
