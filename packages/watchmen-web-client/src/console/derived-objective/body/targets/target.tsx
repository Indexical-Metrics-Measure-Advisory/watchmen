import {Objective, ObjectiveTarget, ObjectiveTargetValues} from '@/services/data/tuples/objective-types';
import {Lang} from '@/widgets/langs';
import {ObjectiveValueGrowthIcon} from '@/widgets/objective/growth-icon';
import {asDisplayValue, asFinishRatio, asIncreaseRatio, asValues, fromTobe} from '@/widgets/objective/utils';
import React from 'react';
import {
	TargetCard,
	TargetIndex,
	TargetName,
	TargetValue,
	TargetValueLabel,
	TargetValueRow,
	ValuePlaceholder
} from './widgets';

const TargetTitle = (props: { target: ObjectiveTarget; index: number }) => {
	const {target, index} = props;

	return <TargetName>
		<TargetIndex>#{index}</TargetIndex>
		<span>{target.name || Lang.CONSOLE.DERIVED_OBJECTIVE.UNKNOWN_TARGET_NAME}</span>
	</TargetName>;
};

const FinishRate = (props: { hasTobe: boolean; tobeValue?: number; currentValue: number }) => {
	const {hasTobe, tobeValue, currentValue} = props;

	if (!hasTobe) {
		return <><ValuePlaceholder/><ValuePlaceholder/></>;
	}

	const ratio = asFinishRatio({base: tobeValue!, value: currentValue});
	return <>
		<TargetValueLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_FINISH_RATE}</TargetValueLabel>
		<TargetValue>
			<span>{ratio}</span>
		</TargetValue>
	</>;
};

const TargetCurrentValueRow = (props: {
	hasTobe: boolean;
	currentValue: number; tobeValue?: number; percentage: boolean;
}) => {
	const {hasTobe, currentValue, tobeValue, percentage} = props;

	return <TargetValueRow data-which="current">
		<TargetValueLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_CURRENT_VALUE}</TargetValueLabel>
		<TargetValue>{asDisplayValue({value: currentValue, percentage})}</TargetValue>
		<FinishRate hasTobe={hasTobe} tobeValue={tobeValue} currentValue={currentValue}/>
	</TargetValueRow>;
};

const TargetPreviousValueRow = (props: {
	target: ObjectiveTarget;
	currentValue: number; previousValue: number, percentage: boolean
}) => {
	const {target, currentValue, previousValue, percentage} = props;

	if (!target.askPreviousCycle) {
		return null;
	}

	const {ratio, volume, better} = asIncreaseRatio({
		base: previousValue, value: currentValue, betterSide: target.betterSide
	});

	return <TargetValueRow>
		<TargetValueLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_PREVIOUS_VALUE}</TargetValueLabel>
		<TargetValue>{asDisplayValue({value: previousValue, percentage})}</TargetValue>
		<ValuePlaceholder/>
		<TargetValue>
			<span>{ratio}</span>
			<ObjectiveValueGrowthIcon volume={volume} better={better}/>
		</TargetValue>
	</TargetValueRow>;
};

const TargetChainValueRow = (props: {
	target: ObjectiveTarget;
	currentValue: number; chainValue: number, percentage: boolean
}) => {
	const {target, currentValue, chainValue, percentage} = props;

	if (!target.askChainCycle) {
		return null;
	}

	const {ratio, volume, better} = asIncreaseRatio({
		base: chainValue, value: currentValue, betterSide: target.betterSide
	});
	return <TargetValueRow>
		<TargetValueLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_CHAIN_VALUE}</TargetValueLabel>
		<TargetValue>{asDisplayValue({value: chainValue, percentage})}</TargetValue>
		<ValuePlaceholder/>
		<TargetValue>
			<span>{ratio}</span>
			<ObjectiveValueGrowthIcon volume={volume} better={better}/>
		</TargetValue>
	</TargetValueRow>;
};

export const Target = (props: {
	objective: Objective; target: ObjectiveTarget; index: number; values?: ObjectiveTargetValues
}) => {
	const {target, index, values} = props;

	if (values == null) {
		return <TargetCard>
			<TargetTitle target={target} index={index}/>
		</TargetCard>;
	}

	if (values.failed) {
		return <TargetCard>
			<TargetTitle target={target} index={index}/>
			<TargetValueRow>
				<TargetValueLabel data-failed={true}>{Lang.INDICATOR.OBJECTIVE.TEST_VALUE_GET_NONE}</TargetValueLabel>
			</TargetValueRow>
		</TargetCard>;
	}

	const {has: hasTobe, percentage = false, value: tobeValue} = fromTobe(target.tobe);
	const {current: currentValue, previous: previousValue, chain: chainValue} = asValues({values, percentage});

	return <TargetCard>
		<TargetTitle target={target} index={index}/>
		<TargetCurrentValueRow hasTobe={hasTobe}
		                       currentValue={currentValue} tobeValue={tobeValue} percentage={percentage}/>
		<TargetPreviousValueRow target={target}
		                        currentValue={currentValue} previousValue={previousValue} percentage={percentage}/>
		<TargetChainValueRow target={target}
		                     currentValue={currentValue} chainValue={chainValue} percentage={percentage}/>
	</TargetCard>;
};