import {
	Objective,
	ObjectiveFactor,
	ObjectiveFormulaOperator,
	ObjectiveParameterType
} from '@/services/data/tuples/objective-types';
import {Input} from '@/widgets/basic/input';
import {ButtonInk} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import React, {ChangeEvent, useEffect} from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';
import {ComputedEditor} from '../parameter/compute';
import {ParameterEventBusProvider, useParameterEventBus} from '../parameter/parameter-event-bus';
import {ParameterEventTypes} from '../parameter/parameter-event-bus-types';
import {createFactorParameter} from '../parameter/utils';
import {useSave} from '../use-save';
import {isIndicatorFactor} from '../utils';
import {ItemNo, RemoveItemButton} from '../widgets';
import {FactorContainer, FormulaItemLabel} from './widgets';

const FormulaEditor = (props: { objective: Objective; factor: ObjectiveFactor }) => {
	const {objective, factor} = props;

	const save = useSave(false);
	const {on, off} = useParameterEventBus();
	useEffect(() => {
		const onParamChanged = () => save(objective);
		on(ParameterEventTypes.PARAM_CHANGED, onParamChanged);
		return () => {
			off(ParameterEventTypes.PARAM_CHANGED, onParamChanged);
		};
	});

	if (factor.formula == null) {
		factor.formula = isIndicatorFactor(factor)
			? {
				kind: ObjectiveParameterType.COMPUTED,
				operator: ObjectiveFormulaOperator.NONE,
				parameters: []
			}
			: {
				kind: ObjectiveParameterType.COMPUTED,
				operator: ObjectiveFormulaOperator.ADD,
				parameters: [createFactorParameter(), createFactorParameter()]
			};
	}

	const hasAsIs = isIndicatorFactor(factor);
	const factors = (objective.factors || []).filter(f => f !== factor);

	return <>
		<FormulaItemLabel>Formula</FormulaItemLabel>
		<ComputedEditor objective={objective} parameter={factor.formula!} factors={factors}
		                hasAsIs={hasAsIs}/>
	</>;
};

export const FactorItem = (props: {
	objective: Objective;
	factor: ObjectiveFactor;
	index: number;
	onRemove: (factor: ObjectiveFactor) => void;
}) => {
	const {objective, factor, index, onRemove} = props;

	const {fire} = useObjectivesEventBus();
	const save = useSave();

	const onNameChanged = (event: ChangeEvent<HTMLInputElement>) => {
		const {value} = event.target;
		factor.name = value;
		fire(ObjectivesEventTypes.FACTOR_NAME_CHANGED, objective, factor);
		save(objective);
	};
	const onRemoveClicked = () => onRemove(factor);

	return <FactorContainer>
		<ItemNo>{index === -1 ? '' : `#${index}`}</ItemNo>
		<Input value={factor.name || ''} onChange={onNameChanged}
		       placeholder={Lang.PLAIN.OBJECTIVE_FACTOR_NAME_PLACEHOLDER}/>
		<ParameterEventBusProvider>
			<FormulaEditor objective={objective} factor={factor}/>
		</ParameterEventBusProvider>
		<RemoveItemButton ink={ButtonInk.DANGER} onClick={onRemoveClicked}>
			{Lang.ACTIONS.REMOVE}
		</RemoveItemButton>
	</FactorContainer>;
};