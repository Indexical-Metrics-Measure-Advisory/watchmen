import {ConsanguinityEventTypes, useConsanguinityEventBus} from '@/consanguinity';
import {Objective, ObjectiveFactor, ObjectiveTarget} from '@/services/data/tuples/objective-types';
import {isIndicatorFactor} from '@/services/data/tuples/objective-utils';
import {generateUuid} from '@/services/data/tuples/utils';
import {noop} from '@/services/utils';
import {ButtonInk} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import React, {useEffect} from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';
import {EditStep} from '../edit-step';
import {useValuesFetched} from '../hooks/use-ask-values';
import {ObjectiveDeclarationStep} from '../steps';
import {AddItemButton, ItemsButtons} from '../widgets';
import {Target} from './target';
import {TargetsContainer} from './widgets';

export const Targets = (props: { objective: Objective }) => {
	const {objective} = props;

	const {on, off, fire} = useObjectivesEventBus();
	const {fire: fireConsanguinity} = useConsanguinityEventBus();
	const {findTargetValues} = useValuesFetched();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onFactorChanged = () => forceUpdate();
		on(ObjectivesEventTypes.FACTOR_ADDED, onFactorChanged);
		on(ObjectivesEventTypes.FACTOR_REMOVED, onFactorChanged);
		on(ObjectivesEventTypes.FACTOR_INDICATOR_CHANGED, onFactorChanged);
		return () => {
			off(ObjectivesEventTypes.FACTOR_ADDED, onFactorChanged);
			off(ObjectivesEventTypes.FACTOR_REMOVED, onFactorChanged);
			off(ObjectivesEventTypes.FACTOR_INDICATOR_CHANGED, onFactorChanged);
		};
	}, [on, off, forceUpdate]);

	if (objective.targets == null) {
		objective.targets = [];
	}

	const onRemove = (target: ObjectiveTarget) => {
		objective.targets!.splice(objective.targets!.indexOf(target), 1);
		fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		forceUpdate();
	};
	const onAddClicked = () => {
		let uuid = generateUuid();
		// eslint-disable-next-line
		while ((objective.targets || []).some(target => target.uuid === uuid)) {
			uuid = generateUuid();
		}
		objective.targets!.push({uuid} as ObjectiveTarget);
		fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		forceUpdate();
	};
	const onTestClicked = () => fire(ObjectivesEventTypes.ASK_VALUES);
	const onConsanguinityClicked = () => {
		fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, (_, saved) => {
			if (saved) {
				fireConsanguinity(ConsanguinityEventTypes.ASK_SINGLE_OBJECTIVE, objective);
			}
		}, true);
	};

	const targets: Array<ObjectiveTarget> = objective.targets || [];
	const factors: Array<ObjectiveFactor> = objective.factors || [];
	const couldTest = targets.length !== 0 && factors.some(f => isIndicatorFactor(f));

	return <EditStep index={ObjectiveDeclarationStep.TARGETS} title={Lang.INDICATOR.OBJECTIVE.TARGETS_TITLE}
	                 backToList={true}>
		<TargetsContainer>
			{targets.map((target, index) => {
				return <Target objective={objective} target={target} index={index + 1}
				               values={findTargetValues(target)}
				               onRemove={onRemove}
				               key={target.uuid}/>;
			})}
			<ItemsButtons>
				<AddItemButton ink={ButtonInk.PRIMARY} onClick={onAddClicked}>
					{Lang.INDICATOR.OBJECTIVE.ADD_TARGET}
				</AddItemButton>
				{couldTest
					? <>
						<AddItemButton ink={ButtonInk.PRIMARY} onClick={onTestClicked}>
							{Lang.INDICATOR.OBJECTIVE.TEST_VALUE_CLICK}
						</AddItemButton>
						<AddItemButton ink={ButtonInk.PRIMARY} onClick={onConsanguinityClicked}>
							{Lang.INDICATOR.OBJECTIVE.TARGET_CONSANGUINITY}
						</AddItemButton>
					</>
					: null}
			</ItemsButtons>
		</TargetsContainer>
	</EditStep>;
};
