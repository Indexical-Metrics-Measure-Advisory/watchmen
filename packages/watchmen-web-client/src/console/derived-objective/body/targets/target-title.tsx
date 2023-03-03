import {ObjectiveTarget} from '@/services/data/tuples/objective-types';
import {DwarfButton} from '@/widgets/basic/button';
import {ButtonInk} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import React from 'react';
import {TargetIndex, TargetName} from './widgets';

export const TargetTitle = (props: {
	target: ObjectiveTarget; index: number;
	breakdown: boolean; onBreakdownClicked?: () => void;
}) => {
	const {target, index, breakdown, onBreakdownClicked} = props;

	return <TargetName>
		<TargetIndex>#{index}</TargetIndex>
		<span>{target.name || Lang.CONSOLE.DERIVED_OBJECTIVE.UNKNOWN_TARGET_NAME}</span>
		{breakdown
			? <DwarfButton ink={ButtonInk.INFO} onClick={onBreakdownClicked}>
				{Lang.CONSOLE.DERIVED_OBJECTIVE.BREAKDOWN}
			</DwarfButton>
			: null}
	</TargetName>;
};