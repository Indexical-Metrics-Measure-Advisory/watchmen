import {Indicator} from '@/services/data/tuples/indicator-types';
import {Objective, ObjectiveFactor, ObjectiveFactorValues} from '@/services/data/tuples/objective-types';
import {ButtonInk} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import React from 'react';
import {ParameterEventBusProvider} from '../objective-parameter/parameter-event-bus';
import {ItemNo, RemoveItemButton} from '../widgets';
import {FactorIndicator} from './factor-indicator';
import {FactorItemTest} from './factor-item-test';
import {FactorName} from './factor-name';
import {FormulaEditor} from './formula-editor';
import {FactorContainer} from './widgets';

export const FactorItem = (props: {
	objective: Objective; factor: ObjectiveFactor; index: number;
	values?: ObjectiveFactorValues;
	onRemove: (factor: ObjectiveFactor) => void;
	indicators: Array<Indicator>;
}) => {
	const {objective, factor, index, values, onRemove, indicators} = props;

	const onRemoveClicked = () => onRemove(factor);

	return <FactorContainer>
		<ItemNo>{index === -1 ? '' : `#${index}`}</ItemNo>
		<FactorName objective={objective} factor={factor}/>
		<FactorIndicator objective={objective} factor={factor} indicators={indicators}/>
		<ParameterEventBusProvider>
			<FormulaEditor objective={objective} factor={factor}/>
		</ParameterEventBusProvider>
		<FactorItemTest objective={objective} factor={factor} values={values}/>
		<RemoveItemButton ink={ButtonInk.DANGER} onClick={onRemoveClicked}>
			{Lang.ACTIONS.REMOVE}
		</RemoveItemButton>
	</FactorContainer>;
};