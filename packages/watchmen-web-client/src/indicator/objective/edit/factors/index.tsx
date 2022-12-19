import {
	Objective,
	ObjectiveFactor,
	ObjectiveFactorKind,
	ObjectiveFactorOnComputation,
	ObjectiveFactorOnIndicator
} from '@/services/data/tuples/objective-types';
import {generateUuid} from '@/services/data/tuples/utils';
import {ButtonInk} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import React from 'react';
import {EditStep} from '../edit-step';
import {ObjectiveDeclarationStep} from '../steps';
import {useSave} from '../use-save';
import {AddItemButton, ItemsButtons} from '../widgets';
import {FactorItem} from './factor-item';
import {FactorsContainer} from './widgets';

export const Factors = (props: { objective: Objective }) => {
	const {objective} = props;

	const save = useSave();

	if (objective.factors == null) {
		objective.factors = [];
	}

	const uuid = () => {
		let id = generateUuid();
		// eslint-disable-next-line
		while (objective.factors!.some(factor => factor.factorId === id)) {
			id = generateUuid();
		}
		return id;
	};

	const onRemove = (factor: ObjectiveFactor) => {
		objective.factors!.splice(objective.factors!.indexOf(factor), 1);
		save(objective);
	};
	const onAddIndicatorClicked = () => {
		objective.factors!.push({factorId: uuid(), kind: ObjectiveFactorKind.INDICATOR} as ObjectiveFactorOnIndicator);
		save(objective);
	};
	const onAddComputedIndicatorClicked = () => {
		objective.factors!.push({factorId: uuid(), kind: ObjectiveFactorKind.COMPUTED} as ObjectiveFactorOnComputation);
		save(objective);
	};

	const factors = objective.factors;

	return <EditStep index={ObjectiveDeclarationStep.FACTORS} title={Lang.INDICATOR.OBJECTIVE.FACTORS_TITLE}>
		<FactorsContainer>
			{factors.map((factor, index) => {
				return <FactorItem objective={objective} factor={factor} index={index + 1}
				                   onRemove={onRemove}
				                   key={factor.factorId}/>;
			})}
			<ItemsButtons>
				<AddItemButton ink={ButtonInk.PRIMARY} onClick={onAddIndicatorClicked}>
					{Lang.INDICATOR.OBJECTIVE.ADD_INDICATOR}
				</AddItemButton>
				<AddItemButton ink={ButtonInk.PRIMARY} onClick={onAddComputedIndicatorClicked}>
					{Lang.INDICATOR.OBJECTIVE.ADD_COMPUTED_INDICATOR}
				</AddItemButton>
			</ItemsButtons>
		</FactorsContainer>
	</EditStep>;
};