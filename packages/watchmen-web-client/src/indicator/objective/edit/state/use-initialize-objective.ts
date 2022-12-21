import {Objective} from '@/services/data/tuples/objective-types';
import {useEffect, useState} from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';
import {createObjective} from '../../utils';

export const useInitializeObjective = (): Objective | null => {
	const {fire} = useObjectivesEventBus();
	const [objective, setObjective] = useState<Objective | null>(null);
	useEffect(() => {
		fire(ObjectivesEventTypes.ASK_OBJECTIVE, (objective?: Objective) => {
			if (objective == null) {
				setObjective(createObjective());
			} else {
				setObjective(objective);
			}
		});
	}, [fire]);

	return objective;
};