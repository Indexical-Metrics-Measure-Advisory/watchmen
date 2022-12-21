import {fetchBucket, fetchBucketsByIds} from '@/services/data/tuples/bucket';
import {Bucket, BucketId} from '@/services/data/tuples/bucket-types';
import {useEffect, useState} from 'react';
import {useObjectivesEventBus} from '../objectives-event-bus';
import {ObjectivesEventTypes} from '../objectives-event-bus-types';

type Buckets = Record<BucketId, Bucket>

export const useBucketDetail = () => {
	const {on, off} = useObjectivesEventBus();
	const [buckets] = useState<Buckets>({});
	useEffect(() => {
		const onAskBucketDetails = async (bucketIds: Array<BucketId>, onData: (buckets: Array<Bucket>) => void) => {
			if (bucketIds.length === 0) {
				onData([]);
			} else {
				// filter the bucket which didn't load yet
				// eslint-disable-next-line
				const lackedBucketIds = bucketIds.filter(bucketId => buckets[`${bucketId}`] == null);
				const lackedBuckets = await fetchBucketsByIds(lackedBucketIds);
				// sync to state
				lackedBuckets.map(bucket => buckets[`${bucket.bucketId}`] = bucket);
				onData(bucketIds.map(bucketId => buckets[`${bucketId}`]).filter(bucket => bucket != null));
			}
		};
		const onAskBucket = async (bucketId: BucketId, onData: (bucket: Bucket) => void) => {
			// eslint-disable-next-line
			const found = buckets[`${bucketId}`];
			if (found != null) {
				onData(found);
			} else {
				const {bucket} = await fetchBucket(bucketId);
				// sync to state
				buckets[`${bucket.bucketId}`] = bucket;
				onData(bucket);
			}
		};
		on(ObjectivesEventTypes.ASK_BUCKETS_DETAILS, onAskBucketDetails);
		on(ObjectivesEventTypes.ASK_BUCKET, onAskBucket);
		return () => {
			off(ObjectivesEventTypes.ASK_BUCKETS_DETAILS, onAskBucketDetails);
			off(ObjectivesEventTypes.ASK_BUCKET, onAskBucket);
		};
	}, [on, off, buckets]);
};