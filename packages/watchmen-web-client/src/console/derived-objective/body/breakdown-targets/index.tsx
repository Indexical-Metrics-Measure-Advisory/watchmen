import {BreakdownTarget, DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {IndicatorId} from '@/services/data/tuples/indicator-types';
import {ObjectiveTarget, ObjectiveTargetValues} from '@/services/data/tuples/objective-types';
import {QueryBucket} from '@/services/data/tuples/query-bucket-types';
import {useEffect, useState} from 'react';
import {v4} from 'uuid';
import {useObjectiveEventBus} from '../../objective-event-bus';
import {ObjectiveEventTypes} from '../../objective-event-bus-types';
import {IndicatorData} from '../../types';
import {BreakdownTargetSection} from './breakdown-target';
import {DefForBreakdownDimension} from './types';
import {BreakdownTargetsContainer} from './widgets';

interface DefinitionData extends DefForBreakdownDimension {
	loaded: boolean;
}

const BreakdownTargetsSection = (props: {
	derivedObjective: DerivedObjective;
	target: ObjectiveTarget; indicatorId: IndicatorId; breakdownTargets: Array<BreakdownTarget>;
	values: ObjectiveTargetValues
}) => {
	const {derivedObjective, target, indicatorId, breakdownTargets, values} = props;

	const {fire} = useObjectiveEventBus();
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

	const {loaded, ...rest} = def;

	return <BreakdownTargetsContainer>
		{breakdownTargets.map((breakdownTarget, index) => {
			return <BreakdownTargetSection derivedObjective={derivedObjective} target={target}
			                               def={rest} breakdown={breakdownTarget} index={index}
			                               values={values} key={v4()}/>;
		})}
	</BreakdownTargetsContainer>;
};

export const BreakdownTargets = (props: {
	derivedObjective: DerivedObjective;
	target: ObjectiveTarget; indicatorId: IndicatorId;
	values: ObjectiveTargetValues
}) => {
	const {derivedObjective, target, indicatorId, values} = props;

	// eslint-disable-next-line eqeqeq
	const breakdownTargets = derivedObjective.breakdownTargets.filter(breakdownTarget => breakdownTarget.targetId == target.uuid);
	if (breakdownTargets.length === 0) {
		return null;
	}

	return <BreakdownTargetsSection derivedObjective={derivedObjective} target={target} indicatorId={indicatorId}
	                                breakdownTargets={breakdownTargets}
	                                values={values}/>;
};