import {BreakdownTarget, DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {IndicatorId} from '@/services/data/tuples/indicator-types';
import {ObjectiveTarget, ObjectiveTargetValues} from '@/services/data/tuples/objective-types';
import {QueryBucket} from '@/services/data/tuples/query-bucket-types';
import {noop} from '@/services/utils';
import {DwarfButton} from '@/widgets/basic/button';
import {ButtonInk} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {useEffect, useState} from 'react';
import {v4} from 'uuid';
import {useObjectiveEventBus} from '../../objective-event-bus';
import {ObjectiveEventTypes} from '../../objective-event-bus-types';
import {IndicatorData} from '../../types';
import {BreakdownTargetSection} from '../breakdown-target';
import {useTargetEventBus} from '../target/target-event-bus';
import {TargetEventTypes} from '../target/target-event-bus-types';
import {DefForBreakdownDimension} from '../types';
import {createBreakdownTarget} from '../utils';
import {BreakdownTargetsBottomBar, BreakdownTargetsContainer} from './widgets';

interface DefinitionData extends DefForBreakdownDimension {
	loaded: boolean;
}

const BreakdownTargetsSection = (props: {
	derivedObjective: DerivedObjective;
	target: ObjectiveTarget; indicatorId: IndicatorId; breakdowns: Array<BreakdownTarget>;
	values: ObjectiveTargetValues;
}) => {
	const {derivedObjective, target, indicatorId, breakdowns, values} = props;

	const {fire} = useObjectiveEventBus();
	const {fire: fireTarget} = useTargetEventBus();
	const [def, setDef] = useState<DefinitionData>({loaded: false, buckets: []});
	useEffect(() => {
		if (!def.loaded) {
			fire(ObjectiveEventTypes.ASK_ALL_BUCKETS, (buckets: Array<QueryBucket>) => {
				fire(ObjectiveEventTypes.ASK_INDICATOR_DATA, indicatorId, (indicatorData?: IndicatorData) => {
					setDef({loaded: true, ...(indicatorData ?? {}), buckets});
				});
			});
		}
	}, [fire, def.loaded, indicatorId]);

	if (!def.loaded || def.indicator == null) {
		return null;
	}

	const onAddClicked = () => {
		const breakdown = createBreakdownTarget(target.uuid);
		fireTarget(TargetEventTypes.ADD_BREAKDOWN, breakdown);
	};

	const {loaded, ...rest} = def;

	return <BreakdownTargetsContainer>
		{breakdowns.map((breakdownTarget, index) => {
			return <BreakdownTargetSection derivedObjective={derivedObjective} target={target}
			                               def={rest} breakdown={breakdownTarget} index={index}
			                               values={values} key={v4()}/>;
		})}
		<BreakdownTargetsBottomBar>
			<DwarfButton ink={ButtonInk.PRIMARY} onClick={onAddClicked}>
				{Lang.CONSOLE.DERIVED_OBJECTIVE.ADD_BREAKDOWN}
			</DwarfButton>
		</BreakdownTargetsBottomBar>
	</BreakdownTargetsContainer>;
};

export const BreakdownTargets = (props: {
	derivedObjective: DerivedObjective;
	target: ObjectiveTarget; indicatorId: IndicatorId;
	values: ObjectiveTargetValues
}) => {
	const {derivedObjective, target, indicatorId, values} = props;

	const {fire} = useObjectiveEventBus();
	const {fire: fireTarget, on: onTarget, off: offTarget} = useTargetEventBus();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onAddBreakdown = (breakdown: BreakdownTarget) => {
			if (derivedObjective.breakdownTargets == null) {
				derivedObjective.breakdownTargets = [];
			}
			derivedObjective.breakdownTargets.push(breakdown);
			forceUpdate();
			fire(ObjectiveEventTypes.SAVE, noop);
		};
		const onRemoveBreakdown = (breakdown: BreakdownTarget) => {
			if (derivedObjective.breakdownTargets == null) {
				derivedObjective.breakdownTargets = [];
			}
			const index = derivedObjective.breakdownTargets.findIndex(item => item === breakdown);
			derivedObjective.breakdownTargets.splice(index, 1);
			forceUpdate();
			fire(ObjectiveEventTypes.SAVE, noop);
			fireTarget(TargetEventTypes.BREAKDOWN_REMOVED, breakdown);
		};
		onTarget(TargetEventTypes.ADD_BREAKDOWN, onAddBreakdown);
		onTarget(TargetEventTypes.REMOVE_BREAKDOWN, onRemoveBreakdown);
		return () => {
			offTarget(TargetEventTypes.ADD_BREAKDOWN, onAddBreakdown);
			offTarget(TargetEventTypes.REMOVE_BREAKDOWN, onRemoveBreakdown);
		};
	}, [fire, fireTarget, onTarget, offTarget, forceUpdate, derivedObjective]);

	// eslint-disable-next-line eqeqeq
	const breakdowns = derivedObjective.breakdownTargets.filter(breakdownTarget => breakdownTarget.targetId == target.uuid);
	if (breakdowns.length === 0) {
		return null;
	}

	return <BreakdownTargetsSection derivedObjective={derivedObjective} target={target} indicatorId={indicatorId}
	                                breakdowns={breakdowns}
	                                values={values}/>;
};