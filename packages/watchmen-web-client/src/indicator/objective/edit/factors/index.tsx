import {Indicator} from '@/services/data/tuples/indicator-types';
import {
	Objective,
	ObjectiveFactor,
	ObjectiveFactorKind,
	ObjectiveFactorOnComputation,
	ObjectiveFactorOnIndicator
} from '@/services/data/tuples/objective-types';
import {isIndicatorFactor} from '@/services/data/tuples/objective-utils';
import {generateUuid} from '@/services/data/tuples/utils';
import {noop} from '@/services/utils';
import {ButtonInk} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import React, {useState} from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';
import {EditStep} from '../edit-step';
import {useAskIndicators} from '../hooks/use-ask-indicators';
import {useValuesFetched} from '../hooks/use-ask-values';
import {ObjectiveDeclarationStep} from '../steps';
import {AddItemButton, ItemsButtons} from '../widgets';
import {FactorItem} from './factor-item';
import {FactorsContainer} from './widgets';

interface Indicators {
	initialized: boolean;
	all: Array<Indicator>;
}

export const Factors = (props: { objective: Objective }) => {
	const {objective} = props;

	const {fire} = useObjectivesEventBus();
	const [indicators, setIndicators] = useState<Indicators>({initialized: false, all: []});
	const {findFactorValues} = useValuesFetched();
	const forceUpdate = useForceUpdate();
	useAskIndicators({
		objective,
		shouldStartAsk: () => !indicators.initialized,
		onLoad: (all) => setIndicators({initialized: true, all})
	});

	if (objective.factors == null) {
		objective.factors = [];
	}

	const uuid = () => {
		let id = generateUuid();
		// eslint-disable-next-line
		while (objective.factors!.some(factor => factor.uuid === id)) {
			id = generateUuid();
		}
		return id;
	};

	const onRemove = (factor: ObjectiveFactor) => {
		objective.factors!.splice(objective.factors!.indexOf(factor), 1);
		fire(ObjectivesEventTypes.FACTOR_REMOVED, objective, factor);
		fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		forceUpdate();
	};
	const onAddIndicatorClicked = () => {
		const factor = {
			uuid: uuid(), kind: ObjectiveFactorKind.INDICATOR, conditional: false
		} as ObjectiveFactorOnIndicator;
		objective.factors!.push(factor);
		fire(ObjectivesEventTypes.FACTOR_ADDED, objective, factor);
		fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		forceUpdate();
	};
	const onAddComputedIndicatorClicked = () => {
		const factor = {uuid: uuid(), kind: ObjectiveFactorKind.COMPUTED} as ObjectiveFactorOnComputation;
		objective.factors!.push(factor);
		fire(ObjectivesEventTypes.FACTOR_ADDED, objective, factor);
		fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		forceUpdate();
	};
	const onTestClicked = () => fire(ObjectivesEventTypes.ASK_VALUES);

	const factors: Array<ObjectiveFactor> = objective.factors || [];
	const couldTest = factors.some(f => isIndicatorFactor(f));

	return <EditStep index={ObjectiveDeclarationStep.FACTORS} title={Lang.INDICATOR.OBJECTIVE.FACTORS_TITLE}>
		<FactorsContainer>
			{factors.map((factor, index) => {
				return <FactorItem objective={objective} factor={factor} index={index + 1}
				                   values={findFactorValues(factor)}
				                   onRemove={onRemove}
				                   indicators={indicators.all}
				                   key={factor.uuid}/>;
			})}
			<ItemsButtons>
				<AddItemButton ink={ButtonInk.PRIMARY} onClick={onAddIndicatorClicked}>
					{Lang.INDICATOR.OBJECTIVE.ADD_INDICATOR}
				</AddItemButton>
				<AddItemButton ink={ButtonInk.PRIMARY} onClick={onAddComputedIndicatorClicked}>
					{Lang.INDICATOR.OBJECTIVE.ADD_COMPUTED_INDICATOR}
				</AddItemButton>
				{couldTest
					? <AddItemButton ink={ButtonInk.PRIMARY} onClick={onTestClicked}>
						{Lang.INDICATOR.OBJECTIVE.TEST_VALUE_CLICK}
					</AddItemButton>
					: null}
			</ItemsButtons>
		</FactorsContainer>
	</EditStep>;
};