import {SAVE_TIMEOUT} from '@/services/constants';
import {saveDerivedObjective} from '@/services/data/tuples/derived-objective';
import {DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {ObjectiveValues} from '@/services/data/tuples/objective-types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {useThrottler} from '@/widgets/throttler';
import {Fragment, useEffect} from 'react';
import {useObjectiveEventBus} from './objective-event-bus';
import {ObjectiveEventTypes} from './objective-event-bus-types';

export const ObjectiveStateHandler = (props: { derivedObjective: DerivedObjective }) => {
	const {derivedObjective} = props;

	const {fire: fireGlobal} = useEventBus();
	const {on, off, fire} = useObjectiveEventBus();
	const saveQueue = useThrottler();
	useEffect(() => saveQueue.clear(true), [derivedObjective, saveQueue]);
	useEffect(() => {
		const onAskValues = () => {
			console.log(derivedObjective)
			saveQueue.replace(() => {
				fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
					async () => await saveDerivedObjective(derivedObjective),
					(values: ObjectiveValues) => fire(ObjectiveEventTypes.SAVED));
			}, SAVE_TIMEOUT);
		};
		on(ObjectiveEventTypes.SAVE, onAskValues);
		return () => {
			off(ObjectiveEventTypes.SAVE, onAskValues);
		};
	}, [fireGlobal, on, off, fire, derivedObjective, saveQueue]);

	return <Fragment/>;
};