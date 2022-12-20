import {
	Objective,
	ObjectiveFormulaOperator,
	ObjectiveParameterType,
	ObjectiveTarget
} from '@/services/data/tuples/objective-types';
import {noop} from '@/services/utils';
import {ButtonInk} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import React, {useEffect} from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';
import {ComputedEditor} from '../parameter/compute';
import {ParameterEventBusProvider, useParameterEventBus} from '../parameter/parameter-event-bus';
import {ParameterEventTypes} from '../parameter/parameter-event-bus-types';
import {createFactorParameter} from '../parameter/utils';
import {AsisContainer, SetTargetAsIsButton} from './widgets';

const FormulaEditor = (props: { objective: Objective; target: ObjectiveTarget }) => {
	// noinspection DuplicatedCode
	const {objective, target} = props;

	const {on: onObjective, off: offObjective, fire: fireObjective} = useObjectivesEventBus();
	const {on, off} = useParameterEventBus();
	useEffect(() => {
		const onParamChanged = () => fireObjective(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		on(ParameterEventTypes.PARAM_CHANGED, onParamChanged);
		return () => {
			off(ParameterEventTypes.PARAM_CHANGED, onParamChanged);
		};
	}, [on, off, fireObjective, objective]);
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onFactorChanged = () => forceUpdate();
		onObjective(ObjectivesEventTypes.FACTOR_ADDED, onFactorChanged);
		onObjective(ObjectivesEventTypes.FACTOR_REMOVED, onFactorChanged);
		return () => {
			offObjective(ObjectivesEventTypes.FACTOR_ADDED, onFactorChanged);
			offObjective(ObjectivesEventTypes.FACTOR_REMOVED, onFactorChanged);
		};
	}, [onObjective, offObjective, forceUpdate]);

	if (target.asis == null) {
		target.asis = {
			kind: ObjectiveParameterType.COMPUTED,
			operator: ObjectiveFormulaOperator.ADD,
			parameters: [createFactorParameter(), createFactorParameter()]
		};
	}

	const factors = (objective.factors || []).filter(f => f !== target);

	return <ComputedEditor objective={objective} parameter={target.asis!} factors={factors} hasAsIs={false}/>;
};

export const AsIs = (props: { objective: Objective; target: ObjectiveTarget }) => {
	const {objective, target} = props;

	const onSetAsIsClicked = () => {
		// TODO
	};

	return <AsisContainer>
		<SetTargetAsIsButton ink={ButtonInk.PRIMARY} onClick={onSetAsIsClicked}>
			{Lang.INDICATOR.OBJECTIVE.TARGET_ASIS_SET}
		</SetTargetAsIsButton>
		<ParameterEventBusProvider>
			<FormulaEditor objective={objective} target={target}/>
		</ParameterEventBusProvider>
	</AsisContainer>;
};
