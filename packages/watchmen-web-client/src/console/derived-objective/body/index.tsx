import {useObjectiveEventBus} from '@/console/derived-objective/objective-event-bus';
import {ObjectiveEventTypes} from '@/console/derived-objective/objective-event-bus-types';
import {DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {ObjectiveTarget} from '@/services/data/tuples/objective-types';
import React, {useEffect, useState} from 'react';
import {useValuesFetched} from '../hooks/use-ask-values';
import {Target} from './target';
import {BodyContainer, TargetsContainer} from './widgets';

export const Body = (props: { derivedObjective: DerivedObjective }) => {
	const {derivedObjective} = props;

	const {fire} = useObjectiveEventBus();
	const [initialized, setInitialized] = useState(false);
	const {findTargetValues} = useValuesFetched();
	useEffect(() => {
		// ask values on first round rendering, values fetch should be handled in values fetched hook.
		if (!initialized) {
			setInitialized(true);
			fire(ObjectiveEventTypes.ASK_VALUES);
		}
	}, [fire, initialized]);

	const {definition: objective} = derivedObjective;

	const targets: Array<ObjectiveTarget> = objective.targets || [];

	return <BodyContainer>
		<TargetsContainer>
			{targets.map((target, index) => {
				return <Target objective={objective} target={target} index={index + 1}
				               values={findTargetValues(target)}
				               key={target.uuid}/>;
			})}
		</TargetsContainer>
	</BodyContainer>;
};