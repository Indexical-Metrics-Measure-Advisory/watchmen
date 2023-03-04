import {useTargetEventBus} from '@/console/derived-objective/body/targets/target-event-bus';
import {TargetEventTypes} from '@/console/derived-objective/body/targets/target-event-bus-types';
import {DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {ObjectiveTarget, ObjectiveTargetValues} from '@/services/data/tuples/objective-types';
import {DwarfButton} from '@/widgets/basic/button';
import {ButtonInk} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import {parseBreakdown} from '@/widgets/objective/breakdown-utils';
import {asValues, fromTobe} from '@/widgets/objective/utils';
import React, {useEffect, useState} from 'react';
import {BreakdownTargets} from '../breakdown-targets';
import {TargetChainValueRow} from './target-chain-value-row';
import {TargetCurrentValueRow} from './target-current-value-row';
import {TargetPreviousValueRow} from './target-previous-value-row';
import {TargetTitle} from './target-title';
import {createBreakdownTarget} from './utils';
import {TargetCard} from './widgets';

const hasBreakdown = (derivedObjective: DerivedObjective, target: ObjectiveTarget) => {
	const breakdownTargets = (derivedObjective.breakdownTargets ?? []).filter(breakdownTarget => {
		// eslint-disable-next-line eqeqeq
		return breakdownTarget.targetId == target.uuid;
	});
	return breakdownTargets.length !== 0;
};

export const ValuedTarget = (props: {
	derivedObjective: DerivedObjective; target: ObjectiveTarget; index: number; values: ObjectiveTargetValues
}) => {
	const {derivedObjective, target, index, values} = props;

	const {on, off} = useTargetEventBus();
	const [isBreakdownVisible, setBreakdownVisible] = useState(hasBreakdown(derivedObjective, target));
	useEffect(() => {
		const onBreakdownRemoved = () => {
			const breakdownExisting = hasBreakdown(derivedObjective, target);
			if (!breakdownExisting && isBreakdownVisible) {
				setBreakdownVisible(false);
			}
		};
		on(TargetEventTypes.BREAKDOWN_REMOVED, onBreakdownRemoved);
		return () => {
			off(TargetEventTypes.BREAKDOWN_REMOVED, onBreakdownRemoved);
		};
	}, [on, off, derivedObjective, target, isBreakdownVisible]);

	const onBreakdownClicked = () => {
		if (!hasBreakdown(derivedObjective, target)) {
			const breakdownTarget = createBreakdownTarget(target.uuid);
			if (derivedObjective.breakdownTargets == null) {
				derivedObjective.breakdownTargets = [];
			}
			derivedObjective.breakdownTargets.push(breakdownTarget);
		}
		setBreakdownVisible(true);
	};
	const onHideBreakdownClicked = () => {
		setBreakdownVisible(false);
	};

	const {has: hasTobe, percentage = false, value: tobeValue} = fromTobe(target.tobe);
	const {current: currentValue, previous: previousValue, chain: chainValue} = asValues({values, percentage});

	const {could: couldBreakdown, indicatorId} = parseBreakdown(derivedObjective.definition, target);

	return <TargetCard data-breakdown-visible={isBreakdownVisible}>
		<TargetTitle target={target} index={index}
		             breakdown={couldBreakdown && (!hasBreakdown || !isBreakdownVisible)}
		             onBreakdownClicked={onBreakdownClicked}/>
		<TargetCurrentValueRow hasTobe={hasTobe}
		                       currentValue={currentValue} tobeValue={tobeValue} percentage={percentage}/>
		<TargetPreviousValueRow target={target}
		                        currentValue={currentValue} previousValue={previousValue} percentage={percentage}/>
		<TargetChainValueRow target={target}
		                     currentValue={currentValue} chainValue={chainValue} percentage={percentage}/>
		{isBreakdownVisible
			? <DwarfButton ink={ButtonInk.PRIMARY} onClick={onHideBreakdownClicked}>
				{Lang.CONSOLE.DERIVED_OBJECTIVE.HIDE_BREAKDOWN}
			</DwarfButton>
			: null}
		{couldBreakdown && isBreakdownVisible
			? <BreakdownTargets derivedObjective={derivedObjective} target={target} indicatorId={indicatorId!}
			                    values={values}/>
			: null}
	</TargetCard>;
};
