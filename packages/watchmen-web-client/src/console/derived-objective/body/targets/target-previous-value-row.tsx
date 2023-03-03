import {ObjectiveTarget} from '@/services/data/tuples/objective-types';
import {Lang} from '@/widgets/langs';
import {ObjectiveValueGrowthIcon} from '@/widgets/objective/growth-icon';
import {asDisplayValue, asIncreaseRatio} from '@/widgets/objective/utils';
import React from 'react';
import {TargetValue, TargetValueLabel, TargetValueRow, ValuePlaceholder} from './widgets';

export const TargetPreviousValueRow = (props: {
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