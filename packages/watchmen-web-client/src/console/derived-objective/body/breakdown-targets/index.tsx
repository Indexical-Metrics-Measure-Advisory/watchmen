import {useTargetEventBus} from '@/console/derived-objective/body/targets/target-event-bus';
import {TargetEventTypes} from '@/console/derived-objective/body/targets/target-event-bus-types';
import {createBreakdownTarget} from '@/console/derived-objective/body/targets/utils';
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
import {BreakdownTargetSection} from './breakdown-target';
import {DefForBreakdownDimension} from './types';
import {BreakdownTargetsBottomBar, BreakdownTargetsContainer} from './widgets';

interface DefinitionData extends DefForBreakdownDimension {
	loaded: boolean;
}

const BreakdownTargetsSection = (props: {
	derivedObjective: DerivedObjective;
	target: ObjectiveTarget; indicatorId: IndicatorId; breakdownTargets: Array<BreakdownTarget>;
	values: ObjectiveTargetValues;
}) => {
	const {derivedObjective, target, indicatorId, breakdownTargets, values} = props;

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
		if (derivedObjective.breakdownTargets == null) {
			derivedObjective.breakdownTargets = [];
		}
		const breakdownTarget = createBreakdownTarget(target.uuid);
		derivedObjective.breakdownTargets.push(breakdownTarget);
		fireTarget(TargetEventTypes.BREAKDOWN_ADDED, breakdownTarget);
		fire(ObjectiveEventTypes.SAVE, noop);
	};

	const {loaded, ...rest} = def;

	return <BreakdownTargetsContainer>
		{breakdownTargets.map((breakdownTarget, index) => {
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

	const {on: onTarget, off: offTarget} = useTargetEventBus();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onBreakdownAdded = () => forceUpdate();
		const onBreakdownRemoved = () => forceUpdate();
		onTarget(TargetEventTypes.BREAKDOWN_ADDED, onBreakdownAdded);
		onTarget(TargetEventTypes.BREAKDOWN_REMOVED, onBreakdownRemoved);
		return () => {
			offTarget(TargetEventTypes.BREAKDOWN_ADDED, onBreakdownAdded);
			offTarget(TargetEventTypes.BREAKDOWN_REMOVED, onBreakdownRemoved);
		};
	}, [onTarget, offTarget, forceUpdate]);

	// eslint-disable-next-line eqeqeq
	const breakdownTargets = derivedObjective.breakdownTargets.filter(breakdownTarget => breakdownTarget.targetId == target.uuid);
	if (breakdownTargets.length === 0) {
		return null;
	}

	return <BreakdownTargetsSection derivedObjective={derivedObjective} target={target} indicatorId={indicatorId}
	                                breakdownTargets={breakdownTargets}
	                                values={values}/>;
};