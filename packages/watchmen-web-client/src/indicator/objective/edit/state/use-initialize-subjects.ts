import {Indicator, IndicatorBaseOn, IndicatorId} from '@/services/data/tuples/indicator-types';
import {Objective} from '@/services/data/tuples/objective-types';
import {SubjectId} from '@/services/data/tuples/subject-types';
import {isNotBlank} from '@/services/utils';
import {useEffect, useState} from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';
import {findIndicators} from './utils';

export const useInitializeSubjects = (objective: Objective | null | undefined, shouldStart: boolean) => {
	const [initialized, setInitialized] = useState(false);
	const {fire} = useObjectivesEventBus();
	useEffect(() => {
		if (objective == null || initialized || !shouldStart) {
			return;
		}

		(async () => {
			const subjectIds = (await findIndicators(objective, (indicatorId: IndicatorId) => {
				return new Promise<Indicator | null>(resolve => {
					fire(ObjectivesEventTypes.ASK_INDICATOR, indicatorId, (indicator?: Indicator) => {
						resolve(indicator ?? null);
					});
				});
			}))
				.filter(indicator => indicator.baseOn === IndicatorBaseOn.SUBJECT)
				.map(indicator => indicator.topicOrSubjectId)
				.filter(subjectId => isNotBlank(subjectId)) as Array<SubjectId>;
			const map: Record<SubjectId, boolean> = {};
			subjectIds.forEach(subjectId => map[`${subjectId}`] = true);
			await Promise.all(Object.keys(map).map(subjectId => {
				return new Promise<void>(resolve => {
					// subject data is unnecessary, just make sure it is loaded
					fire(ObjectivesEventTypes.ASK_SUBJECT, subjectId, () => resolve());
				});
			}));
			setInitialized(true);
		})();

	}, [fire, objective, initialized, shouldStart]);

	return initialized;
};