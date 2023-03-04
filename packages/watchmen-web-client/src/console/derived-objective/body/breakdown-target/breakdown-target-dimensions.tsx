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
import {useTargetEventBus} from '../target/target-event-bus';
import {TargetEventTypes} from '../target/target-event-bus-types';
import {DefForBreakdownDimension} from '../types';
import {BreakdownTargetDimension} from './breakdown-target-dimension';
import {useBreakdownTargetEventBus} from './breakdown-target-event-bus';
import {BreakdownTargetEventTypes} from './breakdown-target-event-bus-types';
import {BreakdownTargetDimensionsContainer} from './widgets';

export const BreakdownTargetDimensions = (props: {
	derivedObjective: DerivedObjective;
	target: ObjectiveTarget; breakdown: BreakdownTarget;
	def: DefForBreakdownDimension;
}) => {
	const {derivedObjective, target, def, breakdown} = props;

	const {fire} = useObjectiveEventBus();
	const {fire: fireTarget} = useTargetEventBus();
	const {fire: fireBreakdown, on: onBreakdown, off: offBreakdown} = useBreakdownTargetEventBus();
	const [readyForValues, setReadyForValues] = useState((breakdown.dimensions ?? []).length !== 0);
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onDimensionAdded = (dimension: BreakdownDimension) => {
			if (breakdown.dimensions == null) {
				breakdown.dimensions = [];
			}
			breakdown.dimensions.push(dimension);
			if (!readyForValues) {
				setReadyForValues(true);
			} else {
				forceUpdate();
			}
			fireBreakdown(BreakdownTargetEventTypes.DIMENSION_ADDED, dimension);
			fire(ObjectiveEventTypes.SAVE, noop);
		};
		const onDimensionChanged = () => {
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
			fireBreakdown(BreakdownTargetEventTypes.DIMENSION_REMOVED, dimension);
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
	}, [fire, fireBreakdown, onBreakdown, offBreakdown, forceUpdate, readyForValues, breakdown]);

	const dimensions = breakdown.dimensions ?? [];

	const onGetValuesClicked = () => {
		fireTarget(TargetEventTypes.ASK_VALUES, breakdown);
	};
	const onRemoveClicked = () => {
		fireTarget(TargetEventTypes.REMOVE_BREAKDOWN, breakdown);
	};

	return <BreakdownTargetDimensionsContainer data-hide-on-share={true}>
		{dimensions.map(dimension => {
			return <BreakdownTargetDimension derivedObjective={derivedObjective}
			                                 target={target} breakdown={breakdown} dimension={dimension}
			                                 def={def}
			                                 key={v4()}/>;
		})}
		{/** add dimension */}
		<BreakdownTargetDimension derivedObjective={derivedObjective}
		                          target={target} breakdown={breakdown} dimension={{} as BreakdownDimension}
		                          def={def}/>
		{readyForValues
			? <DwarfButton ink={ButtonInk.PRIMARY} onClick={onGetValuesClicked}>
				{Lang.CONSOLE.DERIVED_OBJECTIVE.ASK_BREAKDOWN_VALUES}
			</DwarfButton>
			: null}
		<DwarfButton ink={ButtonInk.DANGER} onClick={onRemoveClicked}>
			{Lang.CONSOLE.DERIVED_OBJECTIVE.REMOVE_BREAKDOWN}
		</DwarfButton>
	</BreakdownTargetDimensionsContainer>;
};