import {Bucket, BucketId} from '@/services/data/tuples/bucket-types';
import {Convergence} from '@/services/data/tuples/convergence-types';
import {QueryBucket} from '@/services/data/tuples/query-bucket-types';
import {useEffect} from 'react';
import {useConvergencesEventBus} from '../../convergences-event-bus';
import {ConvergencesEventTypes} from '../../convergences-event-bus-types';

export const useAskBuckets = (options: {
	convergence?: Convergence | null;
	shouldStartAsk: () => boolean;
	// keep it unchanged
	detailBucketIds: (convergence: Convergence) => Promise<Array<BucketId>>;
	// keep it unchanged
	onLoad: (all: Array<QueryBucket>, details: Array<Bucket>) => void;
}) => {
	const {convergence, shouldStartAsk, detailBucketIds, onLoad} = options;

	const {fire} = useConvergencesEventBus();

	useEffect(() => {
		if (convergence == null || !shouldStartAsk()) {
			return;
		}
		fire(ConvergencesEventTypes.ASK_ALL_BUCKETS, async (all: Array<QueryBucket>) => {
			if (all.length === 0) {
				// no bucket
				onLoad(all, []);
			} else {
				const bucketIds: Array<BucketId> = await detailBucketIds(convergence);
				fire(ConvergencesEventTypes.ASK_BUCKETS, bucketIds, (details: Array<Bucket>) => {
					onLoad(all, details);
				});
			}
		});
	}, [fire, convergence, shouldStartAsk, detailBucketIds, onLoad]);
};