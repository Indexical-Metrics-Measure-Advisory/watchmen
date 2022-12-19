import {useParameterEventBus} from '@/indicator/objective/edit/parameter/parameter-event-bus';
import {ParameterEventTypes} from '@/indicator/objective/edit/parameter/parameter-event-bus-types';
import {createFactorParameter} from '@/indicator/objective/edit/parameter/utils';
import {
	Objective,
	ObjectiveFactor,
	ObjectiveFormulaOperator,
	ObjectiveParameterType
} from '@/services/data/tuples/objective-types';
import {ICON_DELETE} from '@/widgets/basic/constants';
import {Input} from '@/widgets/basic/input';
import {ButtonInk} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {ChangeEvent, useEffect} from 'react';
import {ComputedEditor} from '../parameter/compute';
import {ParameterEventBusProvider} from '../parameter/parameter-event-bus';
import {useSave} from '../use-save';
import {ItemNo, RemoveItemButton} from '../widgets';
import {FactorContainer} from './widgets';

const FormulaEditor = (props: { objective: Objective; factor: ObjectiveFactor }) => {
	const {objective, factor} = props;

	const save = useSave(false);
	const {on, off} = useParameterEventBus();
	useEffect(() => {
		const onParamChanged = () => {
			console.log('changed')
			save(objective);
		};
		on(ParameterEventTypes.PARAM_CHANGED, onParamChanged);
		return () => {
			off(ParameterEventTypes.PARAM_CHANGED, onParamChanged);
		};
	});

	const parameter = factor.formula || {
		kind: ObjectiveParameterType.COMPUTED,
		operator: ObjectiveFormulaOperator.ADD,
		parameters: [createFactorParameter(), createFactorParameter()]
	};

	return <ComputedEditor objective={objective} parameter={parameter}/>;
};

export const FactorItem = (props: {
	objective: Objective;
	factor: ObjectiveFactor;
	index: number;
	onRemove: (factor: ObjectiveFactor) => void;
}) => {
	const {objective, factor, index, onRemove} = props;

	const save = useSave();

	const onNameChanged = (event: ChangeEvent<HTMLInputElement>) => {
		const {value} = event.target;
		factor.name = value;
		save(objective);
	};
	const onRemoveClicked = () => onRemove(factor);

	return <FactorContainer>
		<ItemNo>{index === -1 ? '' : `#${index}`}</ItemNo>
		<Input value={factor.name || ''} onChange={onNameChanged}
		       placeholder={Lang.PLAIN.OBJECTIVE_FACTOR_NAME_PLACEHOLDER}/>
		<RemoveItemButton ink={ButtonInk.DANGER} data-as-icon={true} onClick={onRemoveClicked}>
			<FontAwesomeIcon icon={ICON_DELETE}/>
		</RemoveItemButton>
		<ParameterEventBusProvider>
			<FormulaEditor objective={objective} factor={factor}/>
		</ParameterEventBusProvider>
	</FactorContainer>;
};