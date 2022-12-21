import {Indicator, IndicatorBaseOn, IndicatorId} from '@/services/data/tuples/indicator-types';
import {Objective} from '@/services/data/tuples/objective-types';
import {TopicId} from '@/services/data/tuples/topic-types';
import {isNotBlank} from '@/services/utils';
import {useEffect, useState} from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';
import {findIndicators} from './utils';

export const useInitializeTopics = (objective: Objective | null | undefined, shouldStart: boolean) => {
	const [initialized, setInitialized] = useState(false);
	const {fire} = useObjectivesEventBus();
	useEffect(() => {
		if (objective == null || initialized || !shouldStart) {
			return;
		}

		(async () => {
			const topicIds = (await findIndicators(objective, (indicatorId: IndicatorId) => {
				return new Promise<Indicator | null>(resolve => {
					fire(ObjectivesEventTypes.ASK_INDICATOR, indicatorId, (indicator?: Indicator) => {
						resolve(indicator ?? null);
					});
				});
			}))
				.filter(indicator => indicator.baseOn === IndicatorBaseOn.TOPIC)
				.map(indicator => indicator.topicOrSubjectId)
				.filter(topicId => isNotBlank(topicId)) as Array<TopicId>;
			const map: Record<TopicId, boolean> = {};
			topicIds.forEach(topicId => map[`${topicId}`] = true);
			await Promise.all(Object.keys(map).map(topicId => {
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