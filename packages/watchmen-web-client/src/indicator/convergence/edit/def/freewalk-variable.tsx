import {ConvergencesEventTypes} from '@/indicator/convergence/convergences-event-bus-types';
import {Convergence, ConvergenceFreeWalkVariable} from '@/services/data/tuples/convergence-types';
import {noop} from '@/services/utils';
import {Input} from '@/widgets/basic/input';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import React, {ChangeEvent} from 'react';
import {useConvergencesEventBus} from '../../convergences-event-bus';
import {XAxisLegendCell} from './xaxis-legend-cell';
import {YAxisLegendCell} from './yaxis-legend-cell';

const FreeWalkVariable = (props: { convergence: Convergence; variable: ConvergenceFreeWalkVariable }) => {
	const {convergence, variable} = props;

	const {fire} = useConvergencesEventBus();
	const forceUpdate = useForceUpdate();

	const onInputChanged = (event: ChangeEvent<HTMLInputElement>) => {
		const {value} = event.target;
		variable.values = value.split(';')
		fire(ConvergencesEventTypes.SAVE_CONVERGENCE, convergence, noop);
		forceUpdate();
	}

	const value = (variable.values || []).join(';')

	return <>
		<span>{Lang.INDICATOR.CONVERGENCE.VARIABLE_FREE_WALK_SEGMENTS}</span>
		<Input value={value} onChange={onInputChanged} placeholder={Lang.PLAIN.CONVERGENCE_FREEWALK_VALUE_PLACEHOLDER}/>
	</>;
};

export const XAxisFreeWalkVariable = (props: { convergence: Convergence; variable: ConvergenceFreeWalkVariable }) => {
	const {convergence, variable} = props;

	return <XAxisLegendCell convergence={convergence} variable={variable} columns={1}>
		<FreeWalkVariable convergence={convergence} variable={variable}/>
	</XAxisLegendCell>;
};

export const YAxisFreeWalkVariable = (props: { convergence: Convergence; variable: ConvergenceFreeWalkVariable }) => {
	const {convergence, variable} = props;

	return <YAxisLegendCell convergence={convergence} variable={variable}>
		<FreeWalkVariable convergence={convergence} variable={variable}/>
	</YAxisLegendCell>;
};