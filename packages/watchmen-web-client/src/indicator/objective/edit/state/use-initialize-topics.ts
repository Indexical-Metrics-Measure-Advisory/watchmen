import {Indicator, IndicatorId} from '@/services/data/tuples/indicator-types';
import {Objective} from '@/services/data/tuples/objective-types';
import {useEffect, useState} from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';
import {findTopicIds} from './utils';

export const useInitializeTopics = (objective: Objective | null | undefined, shouldStart: boolean) => {
	const [initialized, setInitialized] = useState(false);
	const {fire} = useObjectivesEventBus();
	useEffect(() => {
		if (objective == null || initialized || !shouldStart) {
			return;
		}

		(async () => {
			const topicIds = await findTopicIds(objective, (indicatorId: IndicatorId) => {
				return new Promise<Indicator | null>(resolve => {
					fire(ObjectivesEventTypes.ASK_INDICATOR, indicatorId, (indicator?: Indicator) => {
						resolve(indicator ?? null);
					});
				});
			});
			await Promise.all(topicIds.map(topicId => {
				return new Promise<void>(resolve => {
					// topic data is unnecessary, just make sure it is loaded
					fire(ObjectivesEventTypes.ASK_TOPIC, topicId, () => resolve());
				});
			}));
			setInitialized(true);
		})();

	}, [fire, objective, initialized, shouldStart]);

	return initialized;
};