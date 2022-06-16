import {Apis, get} from '@/services/data/apis';
import {Achievement, AchievementIndicator} from '@/services/data/tuples/achievement-types';
import {Bucket} from '@/services/data/tuples/bucket-types';
import {Indicator, IndicatorBaseOn, MeasureMethod} from '@/services/data/tuples/indicator-types';
import {
	findTopicAndFactor,
	tryToTransformColumnToMeasures,
	tryToTransformToMeasures
} from '@/services/data/tuples/indicator-utils';
import {QueryByBucketMethod, QueryByEnumMethod, QueryByMeasureMethod} from '@/services/data/tuples/query-bucket-types';
import {SubjectForIndicator} from '@/services/data/tuples/query-indicator-types';
import {Topic} from '@/services/data/tuples/topic-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {useEffect, useState} from 'react';
import {useAchievementEventBus} from '../../../achievement-event-bus';
import {AchievementEventTypes} from '../../../achievement-event-bus-types';
import {IndicatorCalculation} from '../indicator-calculation';
import {IndicatorCriteria} from '../indicator-criteria';
import {IndicatorCriteriaDefData} from '../types';

export const IndicatorContent = (props: {
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
	indicator: Indicator;
	id: string;
}) => {
	const {achievement, achievementIndicator, indicator, id} = props;

	const {fire: fireGlobal} = useEventBus();
	const {fire} = useAchievementEventBus();
	const [defData, setDefData] = useState<IndicatorCriteriaDefData>({
		loaded: false,
		valueBuckets: [],
		measureBuckets: []
	});
	useEffect(() => {
		(async () => {
			const [topic, subject, valueBuckets] = await Promise.all([
				indicator.baseOn === IndicatorBaseOn.TOPIC
					? new Promise<Topic | undefined>(resolve => {
						fire(AchievementEventTypes.ASK_TOPIC, indicator.topicOrSubjectId, (topic?: Topic) => {
							resolve(topic);
						});
					})
					: (async () => null)(),
				indicator.baseOn === IndicatorBaseOn.SUBJECT
					? await get({api: Apis.SUBJECT_FOR_INDICATOR_GET, search: {subjectId: indicator.topicOrSubjectId}})
					: (async () => null)(),
				new Promise<Array<Bucket>>(resolve => {
					fire(AchievementEventTypes.ASK_VALUE_BUCKETS, indicator.valueBuckets || [], (buckets: Array<Bucket>) => {
						resolve(buckets);
					});
				})
			]);
			if (topic != null) {
				fire(AchievementEventTypes.ASK_MEASURE_BUCKETS, (topic.factors || []).reduce((measures, factor) => {
					tryToTransformToMeasures(factor).forEach(method => {
						if (method !== MeasureMethod.ENUM) {
							measures.push({method} as QueryByMeasureMethod);
						} else if (factor.enumId != null) {
							measures.push({enumId: factor.enumId, method: MeasureMethod.ENUM} as QueryByEnumMethod);
						}
					});
					return measures;
				}, [] as Array<QueryByBucketMethod>), (buckets: Array<Bucket>) => {
					setDefData({loaded: true, topic, subject: (void 0), valueBuckets, measureBuckets: buckets});
				});
			} else if (subject != null) {
				fire(AchievementEventTypes.ASK_MEASURE_BUCKETS,
					((subject as SubjectForIndicator).dataset.columns || []).reduce<Array<QueryByBucketMethod>>((measures, column) => {
						tryToTransformColumnToMeasures(column, subject).forEach(method => {
							if (method !== MeasureMethod.ENUM) {
								measures.push({method} as QueryByMeasureMethod);
							} else {
								const {factor} = findTopicAndFactor(column, subject);
								if (factor != null && factor.enumId != null) {
									measures.push({
										enumId: factor.enumId,
										method: MeasureMethod.ENUM
									} as QueryByEnumMethod);
								}
							}
						});
						return measures;
					}, [] as Array<QueryByBucketMethod>),
					(buckets: Array<Bucket>) => {
						setDefData({loaded: true, topic: (void 0), subject, valueBuckets, measureBuckets: buckets});
					});
			} else {
				fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>{Lang.ERROR.UNPREDICTED}</AlertLabel>);
			}
		})();
	}, [fireGlobal, fire, indicator]);

	return <>
		<IndicatorCriteria achievement={achievement} achievementIndicator={achievementIndicator}
		                   indicator={indicator}
		                   defData={defData}/>
		{defData.loaded
			? <IndicatorCalculation id={id} achievement={achievement} achievementIndicator={achievementIndicator}
			                        indicator={indicator}
			                        defData={defData}/>
			: null}
	</>;
};