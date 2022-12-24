import {saveObjective} from '@/services/data/tuples/objective';
import {Objective} from '@/services/data/tuples/objective-types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {useThrottler} from '@/widgets/throttler';
import {useEffect} from 'react';
import {useObjectivesEventBus} from '../objectives-event-bus';
import {ObjectivesEventTypes} from '../objectives-event-bus-types';

export const useSaveObjective = () => {
	const {fire: fireGlobal} = useEventBus();
	const {on, off, fire} = useObjectivesEventBus();
	const saveQueue = useThrottler();

	useEffect(() => {
		const onSaveObjective = (objective: Objective, onSaved: (objective: Objective, saved: boolean) => void) => {
			saveQueue.replace(() => {
				fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
					async () => await saveObjective(objective),
					() => {
						fire(ObjectivesEventTypes.OBJECTIVE_SAVED, objective);
						onSaved(objective, true);
					},
					() => onSaved(objective, false));
			}, 500);
		};
		on(ObjectivesEventTypes.SAVE_OBJECTIVE, onSaveObjective);
		return () => {
			off(ObjectivesEventTypes.SAVE_OBJECTIVE, onSaveObjective);
		};
	}, [on, off, fire, fireGlobal, saveQueue]);
};