import {
	Objective,
	ObjectiveTarget,
	ObjectiveTargetBetterSide,
	ObjectiveTargetValues
} from '@/services/data/tuples/objective-types';
import {noop} from '@/services/utils';
import {CheckBox} from '@/widgets/basic/checkbox';
import {Dropdown} from '@/widgets/basic/dropdown';
import {Input} from '@/widgets/basic/input';
import {ButtonInk, DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {ObjectiveValueGrowthIcon} from '@/widgets/objective/growth-icon';
import {asDisplayValue, asFinishRatio, asIncreaseRatio, asValues, fromTobe} from '@/widgets/objective/utils';
import React, {ChangeEvent} from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';
import {ItemLabel, ItemNo, RemoveItemButton} from '../widgets';
import {AsIs} from './as-is';
import {RatioLabel, TargetContainer, Values} from './widgets';

const TargetValues = (props: { target: ObjectiveTarget; values?: ObjectiveTargetValues }) => {
	const {target, values} = props;

	if (values == null) {
		return null;
	}

	if (values.failed) {
		return <>
			<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TEST_VALUE_GET_NONE}</ItemLabel>
			<Values/>
		</>;
	}

	const {has: hasToBe, percentage = false, value: tobeValue} = fromTobe(target.tobe);
	const {current: currentValue, previous: previousValue, chain: chainValue} = asValues({values, percentage});

	return <>
		<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_VALUES}</ItemLabel>
		<Values>
			<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_CURRENT_VALUE}</ItemLabel>
			<ItemLabel>{asDisplayValue({value: currentValue, percentage})}</ItemLabel>
			{hasToBe
				? (() => {
					const ratio = asFinishRatio({base: tobeValue, value: currentValue});
					return <>
						<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_FINISH_RATE}</ItemLabel>
						<RatioLabel>
							<span>{ratio}</span>
						</RatioLabel>
					</>;
				})()
				: <><ItemLabel/><ItemLabel/></>}
			{target.askPreviousCycle
				? (() => {
					const {ratio, volume, better} = asIncreaseRatio({
						base: previousValue, value: currentValue, betterSide: target.betterSide
					});
					return <>
						<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_PREVIOUS_VALUE}</ItemLabel>
						<ItemLabel>{asDisplayValue({value: previousValue, percentage})}</ItemLabel>
						<ItemLabel/>
						<RatioLabel>
							<span>{ratio}</span>
							<ObjectiveValueGrowthIcon volume={volume} better={better}/>
						</RatioLabel>
					</>;
				})()
				: null}
			{target.askChainCycle
				? (() => {
					const {ratio, volume, better} = asIncreaseRatio({
						base: chainValue, value: currentValue, betterSide: target.betterSide
					});
					return <>
						<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_CHAIN_VALUE}</ItemLabel>
						<ItemLabel>{asDisplayValue({value: chainValue, percentage})}</ItemLabel>
						<ItemLabel/>
						<RatioLabel>
							<span>{ratio}</span>
							<ObjectiveValueGrowthIcon volume={volume} better={better}/>
						</RatioLabel>
					</>;
				})()
				: null}
		</Values>
	</>;
};

export const Target = (props: {
	objective: Objective; target: ObjectiveTarget; index: number;
	values?: ObjectiveTargetValues
	onRemove: (target: ObjectiveTarget) => void;
}) => {
	const {objective, target, values, index, onRemove} = props;

	const {fire} = useObjectivesEventBus();
	const forceUpdate = useForceUpdate();

	const onNameChanged = (event: ChangeEvent<HTMLInputElement>) => {
		const {value} = event.target;
		target.name = value;
		fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		forceUpdate();
	};
	const onToBeChanged = (event: ChangeEvent<HTMLInputElement>) => {
		const {value} = event.target;
		target.tobe = value;
		fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		forceUpdate();
	};
	const onBetterSideChanged = (option: DropdownOption) => {
		target.betterSide = option.value as ObjectiveTargetBetterSide;
		fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		forceUpdate();
	};
	const onAskPreviousCycleChanged = (value: boolean) => {
		target.askPreviousCycle = value;
		fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		forceUpdate();
	};
	const onAskChainCycleChanged = (value: boolean) => {
		target.askChainCycle = value;
		fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		forceUpdate();
	};
	const onRemoveClicked = () => onRemove(target);

	const betterSideOptions = [
		{value: ObjectiveTargetBetterSide.MORE, label: Lang.INDICATOR.OBJECTIVE.TARGET_BETTER_SIDE_MORE},
		{value: ObjectiveTargetBetterSide.LESS, label: Lang.INDICATOR.OBJECTIVE.TARGET_BETTER_SIDE_LESS}
	];

	return <TargetContainer>
		<ItemNo>{index === -1 ? '' : `#${index}`}</ItemNo>
		<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_NAME}</ItemLabel>
		<Input value={target.name || ''} onChange={onNameChanged}/>
		<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_TOBE}</ItemLabel>
		<Input value={target.tobe || ''} onChange={onToBeChanged}/>
		<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_TOBE_PLACEHOLDER}</ItemLabel>
		<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_ASIS}</ItemLabel>
		<AsIs objective={objective} target={target}/>
		<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_BETTER_SIDE}</ItemLabel>
		<Dropdown value={target.betterSide || ObjectiveTargetBetterSide.MORE} options={betterSideOptions}
		          onChange={onBetterSideChanged}/>
		<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_ASK_PREVIOUS_CYCLE}</ItemLabel>
		<CheckBox value={target.askPreviousCycle || false} onChange={onAskPreviousCycleChanged}/>
		<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_ASK_CHAIN_CYCLE}</ItemLabel>
		<CheckBox value={target.askChainCycle || false} onChange={onAskChainCycleChanged}/>
		<TargetValues target={target} values={values}/>
		<RemoveItemButton ink={ButtonInk.DANGER} onClick={onRemoveClicked}>
			{Lang.ACTIONS.REMOVE}
		</RemoveItemButton>
	</TargetContainer>;
};