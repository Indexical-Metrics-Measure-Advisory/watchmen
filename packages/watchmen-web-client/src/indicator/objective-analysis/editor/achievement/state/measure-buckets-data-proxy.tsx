import {Bucket} from '@/services/data/tuples/bucket-types';
import {QueryByBucketMethod} from '@/services/data/tuples/query-bucket-types';
import {Fragment, useEffect} from 'react';
import {useAchievementEventBus} from '../../../../achievement/achievement-event-bus';
import {AchievementEventTypes} from '../../../../achievement/achievement-event-bus-types';
import {useObjectiveAnalysisEventBus} from '../../../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../../../objective-analysis-event-bus-types';

export const MeasureBucketsDataProxy = () => {
	const {on, off} = useAchievementEventBus();
	const {fire} = useObjectiveAnalysisEventBus();
	useEffect(() => {
		const onAskBuckets = (methods: Array<QueryByBucketMethod>, onData: (buckets: Array<Bucket>) => void) => {
			fire(ObjectiveAnalysisEventTypes.ASK_MEASURE_BUCKETS, methods, onData);
		};
		on(AchievementEventTypes.ASK_MEASURE_BUCKETS, onAskBuckets);
		return () => {
			off(AchievementEventTypes.ASK_MEASURE_BUCKETS, onAskBuckets);
		};
	}, [on, off, fire]);

	return <Fragment/>;
};