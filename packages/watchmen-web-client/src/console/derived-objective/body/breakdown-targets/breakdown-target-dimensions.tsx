import {BreakdownDimension, BreakdownTarget, DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {ObjectiveTarget} from '@/services/data/tuples/objective-types';
import {noop} from '@/services/utils';
import {DwarfButton} from '@/widgets/basic/button';
import {ButtonInk} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import React, {useEffect, useState} from 'react';
import {v4} from 'uuid';
import {useObjectiveEventBus} from '../../objective-event-bus';
import {ObjectiveEventTypes} from '../../objective-event-bus-types';
import {useTargetEventBus} from '../targets/target-event-bus';
import {TargetEventTypes} from '../targets/target-event-bus-types';
import {BreakdownTargetDimensionRow} from './breakdown-target-dimension';
import {useBreakdownTargetEventBus} from './breakdown-target-event-bus';
import {BreakdownTargetEventTypes} from './breakdown-target-event-bus-types';
import {DefForBreakdownDimension} from './types';
import {BreakdownTargetDimensions} from './widgets';

export const BreakdownTargetDimensionsSection = (props: {
	derivedObjective: DerivedObjective;
	target: ObjectiveTarget; breakdown: BreakdownTarget;
	def: DefForBreakdownDimension;
}) => {
	const {derivedObjective, target, def, breakdown} = props;

	const {fire} = useObjectiveEventBus();
	const {fire: fireTarget} = useTargetEventBus();
	const {on: onBreakdown, off: offBreakdown} = useBreakdownTargetEventBus();
	const [readyForValues, setReadyForValues] = useState((breakdown.dimensions ?? []).length !== 0);
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onDimensionAdded = (dimension: BreakdownDimension) => {
			if (breakdown.dimensions == null) {
				breakdown.dimensions = [];
			}
			breakdown.dimensions.push(dimension);
			setReadyForValues(true);
			fire(ObjectiveEventTypes.SAVE, noop);
		};
		const onDimensionChanged = () => {
			console.log(readyForValues);
			if (!readyForValues) {
				setReadyForValues(true);
			}
			fire(ObjectiveEventTypes.SAVE, noop);
		};
		const onDimensionRemoved = (dimension: BreakdownDimension) => {
			const index = (breakdown.dimensions ?? []).findIndex(d => d === dimension);
			if (index !== -1) {
				breakdown.dimensions.splice(index, 1);
			}
			if ((breakdown.dimensions ?? []).length === 0) {
				setReadyForValues(false);
			} else {
				forceUpdate();
			}
			fire(ObjectiveEventTypes.SAVE, noop);
		};
		onBreakdown(BreakdownTargetEventTypes.ADD_DIMENSION, onDimensionAdded);
		onBreakdown(BreakdownTargetEventTypes.DIMENSION_CHANGED, onDimensionChanged);
		onBreakdown(BreakdownTargetEventTypes.REMOVE_DIMENSION, onDimensionRemoved);
		return () => {
			offBreakdown(BreakdownTargetEventTypes.ADD_DIMENSION, onDimensionAdded);
			offBreakdown(BreakdownTargetEventTypes.DIMENSION_CHANGED, onDimensionChanged);
			offBreakdown(BreakdownTargetEventTypes.REMOVE_DIMENSION, onDimensionRemoved);
		};
	}, [fire, onBreakdown, offBreakdown, forceUpdate, readyForValues, breakdown]);

	const dimensions = breakdown.dimensions ?? [];
	const onRemoveClicked = () => {
		fireTarget(TargetEventTypes.REMOVE_BREAKDOWN, breakdown);
	};

	return <BreakdownTargetDimensions>
		{dimensions.map(dimension => {
			return <BreakdownTargetDimensionRow derivedObjective={derivedObjective}
			                                    target={target} breakdown={breakdown} dimension={dimension}
			                                    def={def}
			                                    key={v4()}/>;
		})}
		{/** add dimension */}
		<BreakdownTargetDimensionRow derivedObjective={derivedObjective}
		                             target={target} breakdown={breakdown} dimension={{} as BreakdownDimension}
		                             def={def}/>
		{readyForValues
			? <DwarfButton ink={ButtonInk.PRIMARY}>
				{Lang.CONSOLE.DERIVED_OBJECTIVE.ASK_BREAKDOWN_VALUES}
			</DwarfButton>
			: null}
		<DwarfButton ink={ButtonInk.DANGER} onClick={onRemoveClicked}>
			{Lang.CONSOLE.DERIVED_OBJECTIVE.REMOVE_BREAKDOWN}
		</DwarfButton>
	</BreakdownTargetDimensions>;
};