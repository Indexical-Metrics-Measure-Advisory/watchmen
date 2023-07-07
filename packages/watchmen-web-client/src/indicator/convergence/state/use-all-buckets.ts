import {listBuckets} from '@/services/data/tuples/bucket';
import {BucketId} from '@/services/data/tuples/bucket-types';
import {QueryBucket} from '@/services/data/tuples/query-bucket-types';
import {useEffect, useState} from 'react';
import {useConvergencesEventBus} from '../convergences-event-bus';
import {ConvergencesEventTypes} from '../convergences-event-bus-types';

interface AllBucketsState {
	loaded: boolean;
	data: Record<BucketId, QueryBucket>;
}

export const useAllBuckets = () => {
	const {on, off} = useConvergencesEventBus();
	const [buckets, setBuckets] = useState<AllBucketsState>({loaded: false, data: {}});

	useEffect(() => {
		const onAskBuckets = async (onData: (buckets: Array<QueryBucket>) => void) => {
			if (!buckets.loaded) {
				const data = (await listBuckets({search: '', pageNumber: 1, pageSize: 9999})).data;
				setBuckets({
					loaded: true, data: data.reduce((map, bucket) => {
						map[`${bucket.bucketId}`] = bucket;
						return map;
					}, {} as Record<BucketId, QueryBucket>)
				});
				onData(data);
			} else {
				onData(Object.values(buckets.data));
			}
		};
		on(ConvergencesEventTypes.ASK_ALL_BUCKETS, onAskBuckets);
		return () => {
			off(ConvergencesEventTypes.ASK_ALL_BUCKETS, onAskBuckets);
		};
	}, [on, off, buckets]);
};