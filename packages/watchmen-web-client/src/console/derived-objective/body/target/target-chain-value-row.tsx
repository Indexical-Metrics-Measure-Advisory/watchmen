import {ObjectiveTarget} from '@/services/data/tuples/objective-types';
import {Lang} from '@/widgets/langs';
import {ObjectiveValueGrowthIcon} from '@/widgets/objective/growth-icon';
import {asDisplayValue, asIncreaseRatio} from '@/widgets/objective/utils';
import React from 'react';
import {TargetValue, TargetValueLabel, TargetValueRow, ValuePlaceholder} from './widgets';

export const TargetChainValueRow = (props: {
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