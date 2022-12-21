import {Bucket, BucketId} from '@/services/data/tuples/bucket-types';
import {Objective} from '@/services/data/tuples/objective-types';
import {QueryBucket} from '@/services/data/tuples/query-bucket-types';
import {useEffect} from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';

export const useAskBuckets = (options: {
	objective?: Objective | null;
	shouldAsk: () => boolean;
	// keep it unchanged
	detailBucketIds: (objective: Objective) => Array<BucketId>;
	// keep it unchanged
	onLoad: (all: Array<QueryBucket>, details: Array<Bucket>) => void;
}) => {
	const {objective, shouldAsk, detailBucketIds, onLoad} = options;

	const {fire} = useObjectivesEventBus();

	useEffect(() => {
		if (objective == null || !shouldAsk()) {
			return;
		}
		fire(ObjectivesEventTypes.ASK_ALL_BUCKETS, (all: Array<QueryBucket>) => {
			if (all.length === 0) {
				// no bucket
				onLoad(all, []);
			} else {
				const bucketIds: Array<BucketId> = detailBucketIds(objective);
				fire(ObjectivesEventTypes.ASK_BUCKETS_DETAILS, bucketIds, (details: Array<Bucket>) => {
					onLoad(all, details);
				});
			}
		});
	}, [fire, objective, detailBucketIds, onLoad]);
};