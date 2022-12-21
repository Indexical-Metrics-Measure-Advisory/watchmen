import {Objective} from '@/services/data/tuples/objective-types';
import {useState} from 'react';
import {useAskBuckets} from '../hooks/use-ask-buckets';
import {askVariableBucketIds} from '../utils';

const askInitialBucketIds = (objective: Objective) => {
	return askVariableBucketIds(objective);
};
export const useInitializeBuckets = (objective?: Objective | null) => {
	const [initialized, setInitialized] = useState(false);
	useAskBuckets({
		objective,
		shouldAsk: () => !initialized,
		detailBucketIds: askInitialBucketIds,
		onLoad: () => setInitialized(true)
	});

	return initialized;
};