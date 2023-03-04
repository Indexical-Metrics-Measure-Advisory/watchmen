import {Lang} from '@/widgets/langs';
import {asDisplayValue, asFinishRatio} from '@/widgets/objective/utils';
import React from 'react';
import {TargetValue, TargetValueLabel, TargetValueRow, ValuePlaceholder} from './widgets';

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

export const TargetCurrentValueRow = (props: {
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