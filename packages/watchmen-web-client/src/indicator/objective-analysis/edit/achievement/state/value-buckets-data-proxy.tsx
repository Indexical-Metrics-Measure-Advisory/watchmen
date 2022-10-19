import {Bucket, BucketId} from '@/services/data/tuples/bucket-types';
import {Fragment, useEffect} from 'react';
import {useAchievementEventBus} from '../../../../achievement/achievement-event-bus';
import {AchievementEventTypes} from '../../../../achievement/achievement-event-bus-types';
import {useObjectiveAnalysisEventBus} from '../../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../../objective-analysis-event-bus-types';

export const ValueBucketsDataProxy = () => {
	const {on, off} = useAchievementEventBus();
	const {fire} = useObjectiveAnalysisEventBus();
	useEffect(() => {
		const onAskBuckets = (bucketIds: Array<BucketId>, onData: (buckets: Array<Bucket>) => void) => {
			fire(ObjectiveAnalysisEventTypes.ASK_VALUE_BUCKETS, bucketIds, onData);
		};
		on(AchievementEventTypes.ASK_VALUE_BUCKETS, onAskBuckets);
		return () => {
			off(AchievementEventTypes.ASK_VALUE_BUCKETS, onAskBuckets);
		};
	}, [on, off, fire]);

	return <Fragment/>;
};