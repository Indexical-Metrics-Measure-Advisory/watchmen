import {BucketId} from '@/services/data/tuples/bucket-types';
import {Indicator, IndicatorId} from '@/services/data/tuples/indicator-types';
import {Objective} from '@/services/data/tuples/objective-types';
import {QueryByBucketMethod} from '@/services/data/tuples/query-bucket-types';
import {SubjectForIndicator} from '@/services/data/tuples/query-indicator-types';
import {Topic} from '@/services/data/tuples/topic-types';
import {useState} from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';
import {useAskBuckets} from '../hooks/use-ask-buckets';
import {askVariableBucketIds, computeMeasureMethodOnColumn, computeMeasureMethodOnFactor} from '../utils';
import {findIndicators, findSubjectIdsByIndicators, findTopicIdsByIndicators} from './utils';

export const useInitializeBuckets = (objective: Objective | null | undefined, shouldStart: boolean) => {
	const {fire} = useObjectivesEventBus();
	const [initialized, setInitialized] = useState(false);

	const askInitialBucketIds = async (objective: Objective): Promise<Array<BucketId>> => {
		// from variables
		const fromVariableBucketIds = askVariableBucketIds(objective);
		// from indicators
		const indicators = await findIndicators(objective, (indicatorId: IndicatorId) => {
			return new Promise<Indicator | null>(resolve => {
				fire(ObjectivesEventTypes.ASK_INDICATOR, indicatorId, (indicator?: Indicator) => {
					resolve(indicator ?? null);
				});
			});
		});
		// from value buckets of indicators
		const valueBucketIds = indicators.map(indicator => indicator.valueBuckets || []).flat();

		// from measure buckets of topics of indicators
		const topics = (await Promise.all(findTopicIdsByIndicators(indicators).map(topicId => {
			return new Promise<Topic | null>(resolve => {
				// topic data is unnecessary, just make sure it is loaded
				fire(ObjectivesEventTypes.ASK_TOPIC, topicId, (topic?: Topic) => resolve(topic ?? null));
			});
		}))).filter(topic => topic != null) as Array<Topic>;
		const bucketIdsFromTopics = (await Promise.all(
			topics.map(topic => {
				return (topic.factors || []).reduce((measures, factor) => {
					return [...measures, ...computeMeasureMethodOnFactor(factor)];
				}, [] as Array<QueryByBucketMethod>);
			})
				.flat()
				.map(method => {
					return new Promise<Array<BucketId>>(resolve => {
						fire(ObjectivesEventTypes.ASK_BUCKET_IDS_BY_MEASURE, method, resolve);
					});
				}))).flat();

		// from measure buckets of subjects of indicators
		const subjects = (await Promise.all(findSubjectIdsByIndicators(indicators).map(subjectId => {
			return new Promise<SubjectForIndicator | null>(resolve => {
				// subject data is unnecessary, just make sure it is loaded
				fire(ObjectivesEventTypes.ASK_SUBJECT, subjectId, (subject?: SubjectForIndicator) => resolve(subject ?? null));
			});
		}))).filter(subject => subject != null) as Array<SubjectForIndicator>;
		const bucketIdsFromSubjects = (await Promise.all(
			subjects.map(subject => {
				return ((subject as SubjectForIndicator).dataset.columns || []).reduce((measures, column) => {
					return [...measures, ...computeMeasureMethodOnColumn(column, subject)];
				}, [] as Array<QueryByBucketMethod>);
			})
				.flat()
				.map(method => {
					return new Promise<Array<BucketId>>(resolve => {
						fire(ObjectivesEventTypes.ASK_BUCKET_IDS_BY_MEASURE, method, resolve);
					});
				}))).flat();

		const map: Record<BucketId, boolean> = {};
		fromVariableBucketIds.forEach(bucketId => map[`${bucketId}`] = true);
		valueBucketIds.forEach(bucketId => map[`${bucketId}`] = true);
		bucketIdsFromTopics.forEach(bucketId => map[`${bucketId}`] = true);
		bucketIdsFromSubjects.forEach(bucketId => map[`${bucketId}`] = true);
		return Object.keys(map);
	};

	useAskBuckets({
		objective,
		shouldStartAsk: () => !initialized && shouldStart,
		detailBucketIds: askInitialBucketIds,
		onLoad: () => setInitialized(true)
	});

	return initialized;
};