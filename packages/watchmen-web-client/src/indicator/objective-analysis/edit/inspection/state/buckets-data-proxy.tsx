import {QueryBucket} from '@/services/data/tuples/query-bucket-types';
import {Fragment, useEffect} from 'react';
import {useInspectionEventBus} from '../../../../inspection/inspection-event-bus';
import {AskBucketsParams, InspectionEventTypes} from '../../../../inspection/inspection-event-bus-types';
import {useObjectiveAnalysisEventBus} from '../../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../../objective-analysis-event-bus-types';

type OnAskBuckets = (params: AskBucketsParams, onData: (buckets: Array<QueryBucket>) => void) => void;

export const BucketsDataProxy = () => {
	const {on, off} = useInspectionEventBus();
	const {fire} = useObjectiveAnalysisEventBus();

	// bucket related
	useEffect(() => {
		const onAskBuckets: OnAskBuckets = ({valueBucketIds, measureMethods}, onData) => {
			fire(ObjectiveAnalysisEventTypes.ASK_QUERY_BUCKETS, {valueBucketIds, measureMethods}, onData);
		};

		on(InspectionEventTypes.ASK_BUCKETS, onAskBuckets);
		return () => {
			off(InspectionEventTypes.ASK_BUCKETS, onAskBuckets);
		};
	}, [on, off, fire]);

	return <Fragment/>;
};