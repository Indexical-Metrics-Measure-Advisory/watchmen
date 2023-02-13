import {
	Objective,
	ObjectiveTarget,
	ObjectiveTargetBetterSide,
	ObjectiveTargetValues
} from '@/services/data/tuples/objective-types';
import {noop} from '@/services/utils';
import {CheckBox} from '@/widgets/basic/checkbox';
import {ICON_VOLUME_DECREASE, ICON_VOLUME_INCREASE, ICON_VOLUME_NO_CHANGE} from '@/widgets/basic/constants';
import {Dropdown} from '@/widgets/basic/dropdown';
import {Input} from '@/widgets/basic/input';
import {ButtonInk, DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {createNumberFormat} from '@/widgets/report/chart-utils/number-format';
import {IconDefinition} from '@fortawesome/fontawesome-svg-core';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {ChangeEvent} from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';
import {ItemLabel, ItemNo, RemoveItemButton} from '../widgets';
import {AsIs} from './as-is';
import {RatioLabel, TargetContainer, Values} from './widgets';

const fromTobe = (tobe?: string): { has: false; percentage: false; value: undefined } | { has: true; percentage: boolean; value: number } => {
	tobe = (tobe || '').trim();
	if (tobe.length === 0) {
		return {has: false, percentage: false, value: (void 0)};
	}

	if (tobe.endsWith('%')) {
		const tobeValue = Number(tobe.substring(0, tobe.length - 1));
		if (isNaN(tobeValue)) {
			return {has: false, percentage: false, value: (void 0)};
		} else {
			return {has: true, percentage: true, value: tobeValue};
		}
	} else {
		const tobeValue = Number(tobe);
		if (isNaN(tobeValue)) {
			return {has: false, percentage: false, value: (void 0)};
		} else {
			return {has: true, percentage: false, value: tobeValue};
		}
	}
};

enum VolumeChange {
	INCREASE = 'increase', DECREASE = 'decrease', KEEP = 'keep'
}

const VolumeChangeIcons: Record<VolumeChange, IconDefinition> = {
	[VolumeChange.INCREASE]: ICON_VOLUME_INCREASE,
	[VolumeChange.DECREASE]: ICON_VOLUME_DECREASE,
	[VolumeChange.KEEP]: ICON_VOLUME_NO_CHANGE
};

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
	const asValue = (options: { value?: number; percentage: boolean }): number => {
		const {value, percentage} = options;
		if (percentage) {
			return (value ?? 0) * 100;
		} else {
			return value ?? 0;
		}
	};

	const currentValue = asValue({value: values.currentValue, percentage});
	const previousValue = asValue({value: values.previousValue, percentage});
	const chainValue = asValue({value: values.chainValue, percentage});

	const format = createNumberFormat(2, true);
	const percentageFormat = createNumberFormat(1, true);
	const asDisplayValue = (options: { value: number, percentage: boolean }): string => {
		const {value, percentage} = options;
		if (percentage) {
			return percentageFormat(value) + '%';
		} else {
			return format(value);
		}
	};
	const asFinishRatio = (options: { base: number, value: number }): string => {
		const {base, value} = options;
		if (base === 0) {
			return 'N/A';
		} else {
			return percentageFormat(value / base * 100) + '%';
		}
	};
	const asIncreaseRatio = (options: { base: number, value: number }): { ratio: string, volume?: VolumeChange, better?: 'true' | 'false' | 'keep' } => {
		const {base, value} = options;
		if (base === 0) {
			return {ratio: 'N/A'};
		} else {
			const volume = value > base ? VolumeChange.INCREASE : (value < base ? VolumeChange.DECREASE : VolumeChange.KEEP);
			return {
				ratio: percentageFormat((value - base) / base * 100) + '%',
				volume,
				better: (() => {
					if (target.betterSide === ObjectiveTargetBetterSide.LESS) {
						if (value > base) {
							return 'false';
						} else if (value < base) {
							return 'true';
						} else {
							return 'keep';
						}
					} else {
						if (value > base) {
							return 'true';
						} else if (value < base) {
							return 'false';
						} else {
							return 'keep';
						}
					}
				})()
			};
		}
	};

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
					const {ratio, volume, better} = asIncreaseRatio({base: previousValue, value: currentValue});
					return <>
						<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_PREVIOUS_VALUE}</ItemLabel>
						<ItemLabel>{asDisplayValue({value: previousValue, percentage})}</ItemLabel>
						<ItemLabel/>
						<RatioLabel>
							<span>{ratio}</span>
							{volume != null ?
								<FontAwesomeIcon icon={VolumeChangeIcons[volume]} data-better={better}/> : null}
						</RatioLabel>
					</>;
				})()
				: null}
			{target.askChainCycle
				? (() => {
					const {ratio, volume, better} = asIncreaseRatio({base: chainValue, value: currentValue});
					return <>
						<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_CHAIN_VALUE}</ItemLabel>
						<ItemLabel>{asDisplayValue({value: chainValue, percentage})}</ItemLabel>
						<ItemLabel/>
						<RatioLabel>
							<span>{ratio}</span>
							{volume != null ?
								<FontAwesomeIcon icon={VolumeChangeIcons[volume]} data-better={better}/> : null}
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