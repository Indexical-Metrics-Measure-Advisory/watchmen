import {useConvergencesEventBus} from '@/indicator/convergence/convergences-event-bus';
import {ConvergencesEventTypes} from '@/indicator/convergence/convergences-event-bus-types';
import {Convergence, ConvergenceVariable} from '@/services/data/tuples/convergence-types';
import {ICON_DELETE} from '@/widgets/basic/constants';
import {Input} from '@/widgets/basic/input';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {ChangeEvent, ReactNode} from 'react';
import {XRemoveMeButton, XAxisLegendCellContainer, XVariableContent} from './widgets';

export const XAxisLegendCell = (props: {
	convergence: Convergence; variable: ConvergenceVariable;
	columns: number;
	children: ReactNode
}) => {
	const {convergence, variable, columns, children} = props;

	const {fire} = useConvergencesEventBus();
	const forceUpdate = useForceUpdate();

	const onInputChanged = (event: ChangeEvent<HTMLInputElement>) => {
		variable.name = event.target.value;
		forceUpdate();
	};
	const onDeleteClicked = () => {
		fire(ConvergencesEventTypes.DELETE_VARIABLE, convergence, variable);
	}

	return <XAxisLegendCellContainer>
		<span>{Lang.INDICATOR.CONVERGENCE.VARIABLE_NAME}</span>
		<Input value={variable.name ?? ''} onChange={onInputChanged}/>
		<XVariableContent columns={columns}>
			{children}
		</XVariableContent>
		<XRemoveMeButton onClick={onDeleteClicked}>
			<FontAwesomeIcon icon={ICON_DELETE}/>
		</XRemoveMeButton>
	</XAxisLegendCellContainer>;
};