import {saveConvergence} from '@/services/data/tuples/convergence';
import {Convergence} from '@/services/data/tuples/convergence-types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {useThrottler} from '@/widgets/throttler';
import {useEffect} from 'react';
import {useConvergencesEventBus} from '../convergences-event-bus';
import {ConvergencesEventTypes} from '../convergences-event-bus-types';

export const useSaveConvergence = () => {
	const {fire: fireGlobal} = useEventBus();
	const {on, off, fire} = useConvergencesEventBus();
	const saveQueue = useThrottler();

	useEffect(() => {
		const onSaveConvergence = (convergence: Convergence, onSaved: (convergence: Convergence, saved: boolean) => void, immediately?: boolean) => {
			if (immediately) {
				saveQueue.clear(false);
				fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
					async () => await saveConvergence(convergence),
					() => {
						fire(ConvergencesEventTypes.CONVERGENCE_SAVED, convergence);
						onSaved(convergence, true);
					},
					() => onSaved(convergence, false));
			} else {
				saveQueue.replace(() => {
					fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
						async () => await saveConvergence(convergence),
						() => {
							fire(ConvergencesEventTypes.CONVERGENCE_SAVED, convergence);
							onSaved(convergence, true);
						},
						() => onSaved(convergence, false));
				}, 500);
			}
		};
		on(ConvergencesEventTypes.SAVE_CONVERGENCE, onSaveConvergence);
		return () => {
			off(ConvergencesEventTypes.SAVE_CONVERGENCE, onSaveConvergence);
		};
	}, [on, off, fire, fireGlobal, saveQueue]);
};