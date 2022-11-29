import {Objective} from '@/services/data/tuples/objective-types';
import {noop} from '@/services/utils';
import {useForceUpdate} from '@/widgets/basic/utils';
import {useThrottler} from '@/widgets/throttler';
import {useObjectivesEventBus} from '../objectives-event-bus';
import {ObjectivesEventTypes} from '../objectives-event-bus-types';

export const useSave = (): ((objective: Objective) => void) => {
	const {fire} = useObjectivesEventBus();
	const saveQueue = useThrottler();
	const forceUpdate = useForceUpdate();

	return (objective: Objective) => {
		saveQueue.replace(() => {
			fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		}, 500);
		forceUpdate();
	};
};