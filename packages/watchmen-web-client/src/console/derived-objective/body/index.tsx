import {DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import React, {useEffect, useState} from 'react';
import {useValuesFetched} from '../hooks/use-ask-values';
import {useObjectiveEventBus} from '../objective-event-bus';
import {ObjectiveEventTypes} from '../objective-event-bus-types';
import {Targets} from './targets';
import {TimeFrame} from './time-frame';
import {Variables} from './variables';
import {BodyContainer} from './widgets';

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

	return <BodyContainer>
		<TimeFrame derivedObjective={derivedObjective}/>
		<Variables derivedObjective={derivedObjective}/>
		<Targets derivedObjective={derivedObjective} findTargetValues={findTargetValues}/>
	</BodyContainer>;
};