import {listBuckets} from '@/services/data/tuples/bucket';
import {QueryBucket} from '@/services/data/tuples/query-bucket-types';
import {useEffect, useState} from 'react';
import {useObjectivesEventBus} from '../objectives-event-bus';
import {ObjectivesEventTypes} from '../objectives-event-bus-types';

interface AllBucketsState {
	loaded: boolean;
	data: Array<QueryBucket>;
}

export const useAllBuckets = () => {
	const {on, off} = useObjectivesEventBus();
	const [buckets, setBuckets] = useState<AllBucketsState>({loaded: false, data: []});

	useEffect(() => {
		const onAskBuckets = async (onData: (buckets: Array<QueryBucket>) => void) => {
			if (!buckets.loaded) {
				const data = (await listBuckets({search: '', pageNumber: 1, pageSize: 9999})).data;
				setBuckets({loaded: true, data});
				onData(data);
			} else {
				onData(buckets.data);
			}
		};
		on(ObjectivesEventTypes.ASK_ALL_BUCKETS, onAskBuckets);
		return () => {
			off(ObjectivesEventTypes.ASK_ALL_BUCKETS, onAskBuckets);
		};
	}, [on, off, buckets]);
};