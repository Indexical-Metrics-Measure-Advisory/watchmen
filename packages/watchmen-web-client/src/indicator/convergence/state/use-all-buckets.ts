import {listBuckets} from '@/services/data/tuples/bucket';
import {BucketId} from '@/services/data/tuples/bucket-types';
import {isEnumMeasureBucket, isMeasureBucket} from '@/services/data/tuples/bucket-utils';
import {QueryBucket, QueryByBucketMethod} from '@/services/data/tuples/query-bucket-types';
import {isQueryByEnum, isQueryByMeasure} from '@/services/data/tuples/query-bucket-utils';
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
		const onAskBucketIdByMeasure = (method: QueryByBucketMethod, onData: (bucketIds: Array<BucketId>) => void) => {
			if (isQueryByEnum(method)) {
				onData(Object.values(buckets.data).filter(bucket => isEnumMeasureBucket(bucket) && bucket.enumId === method.enumId).map(bucket => bucket.bucketId));
			} else if (isQueryByMeasure(method)) {
				onData(Object.values(buckets.data).filter(bucket => isMeasureBucket(bucket) && bucket.measure === method.method).map(bucket => bucket.bucketId));
			} else {
				onData([]);
			}
		};
		on(ConvergencesEventTypes.ASK_ALL_BUCKETS, onAskBuckets);
		on(ConvergencesEventTypes.ASK_BUCKET_IDS_BY_MEASURE, onAskBucketIdByMeasure);
		return () => {
			off(ConvergencesEventTypes.ASK_ALL_BUCKETS, onAskBuckets);
			off(ConvergencesEventTypes.ASK_BUCKET_IDS_BY_MEASURE, onAskBucketIdByMeasure);
		};
	}, [on, off, buckets]);
};