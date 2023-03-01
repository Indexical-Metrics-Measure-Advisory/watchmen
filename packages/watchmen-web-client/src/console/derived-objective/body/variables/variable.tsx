import {Objective, ObjectiveVariable} from '@/services/data/tuples/objective-types';
import {isRangeVariable, isValueVariable} from '@/services/data/tuples/objective-utils';
import {noop} from '@/services/utils';
import {Button} from '@/widgets/basic/button';
import {Input} from '@/widgets/basic/input';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import React, {ChangeEvent} from 'react';
import {useObjectiveEventBus} from '../../objective-event-bus';
import {ObjectiveEventTypes} from '../../objective-event-bus-types';
import {RangeVariableConjunction, RangeVariableContainer, VariableName} from './widgets';

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

const RangeVariableEditor = (props: { objective: Objective; variable: ObjectiveVariable }) => {
	const {variable} = props;

	const {fire} = useObjectiveEventBus();
	const forceUpdate = useForceUpdate();

	if (!isRangeVariable(variable)) {
		return null;
	}

	const onIncludeChanged = (key: 'includeMin' | 'includeMax') => () => {
		variable[key] = !variable[key];
		fire(ObjectiveEventTypes.SAVE, noop);
		forceUpdate();
	};
	const onValueChanged = (key: 'min' | 'max') => (event: ChangeEvent<HTMLInputElement>) => {
		variable[key] = event.target.value;
		fire(ObjectiveEventTypes.SAVE, noop);
		forceUpdate();
	};

	return <RangeVariableContainer>
		<Button onClick={onIncludeChanged('includeMin')}>
			{variable.includeMin ? Lang.INDICATOR.OBJECTIVE.VARIABLE_RANGE_INCLUDE_MIN : Lang.INDICATOR.OBJECTIVE.VARIABLE_RANGE_NOT_INCLUDE_MIN}
		</Button>
		<Input value={variable.min ?? ''} onChange={onValueChanged('min')}/>
		<RangeVariableConjunction>{Lang.INDICATOR.OBJECTIVE.VARIABLE_RANGE_TO}</RangeVariableConjunction>
		<Input value={variable.max ?? ''} onChange={onValueChanged('max')}/>
		<Button onClick={onIncludeChanged('includeMax')}>
			{variable.includeMax ? Lang.INDICATOR.OBJECTIVE.VARIABLE_RANGE_INCLUDE_MAX : Lang.INDICATOR.OBJECTIVE.VARIABLE_RANGE_NOT_INCLUDE_MAX}
		</Button>
	</RangeVariableContainer>;
};

export const Variable = (props: { objective: Objective; variable: ObjectiveVariable; index: number }) => {
	const {objective, variable} = props;

	return <>
		<VariableName>{variable.name || Lang.CONSOLE.DERIVED_OBJECTIVE.UNKNOWN_VARIABLE_NAME}</VariableName>
		<ValueVariableEditor objective={objective} variable={variable}/>
		<RangeVariableEditor objective={objective} variable={variable}/>
	</>;
};
