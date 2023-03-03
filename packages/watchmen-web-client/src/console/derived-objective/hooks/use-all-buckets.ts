import {listBuckets} from '@/services/data/tuples/bucket';
import {BucketId} from '@/services/data/tuples/bucket-types';
import {QueryBucket} from '@/services/data/tuples/query-bucket-types';
import {useEffect, useState} from 'react';
import {useObjectiveEventBus} from '../objective-event-bus';
import {ObjectiveEventTypes} from '../objective-event-bus-types';

interface AllBucketsState {
	loaded: boolean;
	data: Record<BucketId, QueryBucket>;
	requester?: Promise<Array<QueryBucket>>;
}

export const useAllBuckets = () => {
	const {on, off} = useObjectiveEventBus();
	const [buckets, setBuckets] = useState<AllBucketsState>({loaded: false, data: {}});

	useEffect(() => {
		const onAskBuckets = async (onData: (buckets: Array<QueryBucket>) => void) => {
			if (!buckets.loaded) {
				if (buckets.requester == null) {
					setBuckets({
						loaded: false, data: {},
						requester: new Promise<Array<QueryBucket>>(async resolve => {
							try {
								const data = (await listBuckets({search: '', pageNumber: 1, pageSize: 9999})).data;
								const buckets = data.reduce((map, bucket) => {
									map[`${bucket.bucketId}`] = bucket;
									return map;
								}, {} as Record<BucketId, QueryBucket>);
								setBuckets({loaded: true, data: buckets});
								onData(data);
								resolve(data);
							} catch {
								onData([]);
								resolve([]);
							}
						})
					});
				} else {
					onData(await buckets.requester);
				}
			} else {
				onData(Object.values(buckets.data));
			}
		};
		on(ObjectiveEventTypes.ASK_ALL_BUCKETS, onAskBuckets);
		return () => {
			off(ObjectiveEventTypes.ASK_ALL_BUCKETS, onAskBuckets);
		};
	}, [on, off, buckets]);
};