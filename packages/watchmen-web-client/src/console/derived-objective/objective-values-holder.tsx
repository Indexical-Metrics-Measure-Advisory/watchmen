import {SAVE_TIMEOUT} from '@/services/constants';
import {DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {askObjectiveValues} from '@/services/data/tuples/objective';
import {ObjectiveValues} from '@/services/data/tuples/objective-types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {useThrottler} from '@/widgets/throttler';
import {Fragment, useEffect} from 'react';
import {useObjectiveEventBus} from './objective-event-bus';
import {ObjectiveEventTypes} from './objective-event-bus-types';

export const ObjectiveValuesHandler = (props: { derivedObjective: DerivedObjective }) => {
	const {derivedObjective} = props;
	const {definition: objective} = derivedObjective;

	const {fire: fireGlobal} = useEventBus();
	const {on, off, fire} = useObjectiveEventBus();
	const saveQueue = useThrottler();
	useEffect(() => saveQueue.clear(true), [objective, saveQueue]);
	useEffect(() => {
		const onAskValues = () => {
			saveQueue.replace(() => {
				fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
					async () => await askObjectiveValues(objective),
					(values: ObjectiveValues) => fire(ObjectiveEventTypes.VALUES_FETCHED, values));
			}, SAVE_TIMEOUT);
		};
		on(ObjectiveEventTypes.ASK_VALUES, onAskValues);
		return () => {
			off(ObjectiveEventTypes.ASK_VALUES, onAskValues);
		};
	}, [fireGlobal, on, off, fire, objective, saveQueue]);

	return <Fragment/>;
};
