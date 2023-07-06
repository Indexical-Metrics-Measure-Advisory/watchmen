import {Convergence, ConvergenceVariable} from '@/services/data/tuples/convergence-types';
import {Input} from '@/widgets/basic/input';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import React, {ChangeEvent, ReactNode} from 'react';
import {useConvergencesEventBus} from '../../convergences-event-bus';
import {ConvergencesEventTypes} from '../../convergences-event-bus-types';
import {YAxisLegendCellContainer, YRemoveMeButton, YVariableContent} from './widgets';

export const YAxisLegendCell = (props: {
	convergence: Convergence; variable: ConvergenceVariable;
	children: ReactNode
}) => {
	const {convergence, variable, children} = props;

	const {fire} = useConvergencesEventBus();
	const forceUpdate = useForceUpdate();

	const onInputChanged = (event: ChangeEvent<HTMLInputElement>) => {
		variable.name = event.target.value;
		forceUpdate();
	};
	const onDeleteClicked = () => {
		fire(ConvergencesEventTypes.DELETE_VARIABLE, convergence, variable);
	};

	return <YAxisLegendCellContainer>
		<span>{Lang.INDICATOR.CONVERGENCE.VARIABLE_NAME}</span>
		<Input value={variable.name ?? ''} onChange={onInputChanged}/>
		<YVariableContent>
			{children}
		</YVariableContent>
		<YRemoveMeButton onClick={onDeleteClicked}>
			{Lang.ACTIONS.DELETE}
		</YRemoveMeButton>
	</YAxisLegendCellContainer>;
};