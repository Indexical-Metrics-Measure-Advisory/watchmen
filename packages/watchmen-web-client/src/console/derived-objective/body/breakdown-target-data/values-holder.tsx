import {askObjectiveTargetBreakdownValues} from '@/services/data/tuples/derived-objective';
import {
	BreakdownTarget,
	DerivedObjective,
	ObjectiveTargetBreakdownValues
} from '@/services/data/tuples/derived-objective-types';
import {ObjectiveTarget} from '@/services/data/tuples/objective-types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {useThrottler} from '@/widgets/throttler';
import {Fragment, useEffect} from 'react';
import {useBreakdownTargetEventBus} from '../breakdown-target/breakdown-target-event-bus';
import {BreakdownTargetEventTypes} from '../breakdown-target/breakdown-target-event-bus-types';

export const ValuesHandler = (props: {
	derivedObjective: DerivedObjective; target: ObjectiveTarget; breakdown: BreakdownTarget;
}) => {
	const {derivedObjective, target, breakdown} = props;
	const {definition: objective} = derivedObjective;

	const {fire: fireGlobal} = useEventBus();
	const {on, off, fire} = useBreakdownTargetEventBus();
	const saveQueue = useThrottler();
	useEffect(() => saveQueue.clear(true), [objective, target, breakdown, saveQueue]);
	useEffect(() => {
		const onAskValues = () => {
			saveQueue.replace(() => {
				fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
					async () => await askObjectiveTargetBreakdownValues(objective, target, breakdown),
					(values: ObjectiveTargetBreakdownValues) => {
						fire(BreakdownTargetEventTypes.VALUES_FETCHED, values);
					}
				);
			}, 300);
		};
		on(BreakdownTargetEventTypes.ASK_VALUES, onAskValues);
		return () => {
			off(BreakdownTargetEventTypes.ASK_VALUES, onAskValues);
		};
	}, [fireGlobal, on, off, fire, objective, target, breakdown, saveQueue]);

	return <Fragment/>;
};
