import {BucketId} from '@/services/data/tuples/bucket-types';
import {Convergence, ConvergenceBucketVariable} from '@/services/data/tuples/convergence-types';
import {isBucketVariable} from '@/services/data/tuples/convergence-utils';
import {isNotBlank} from '@/services/utils';
import {useState} from 'react';
import {useAskBuckets} from '../hooks/use-ask-buckets';

const askVariableBucketIds = (convergence: Convergence): Array<BucketId> => {
	return (convergence.variables || [])
		.filter(v => isBucketVariable(v) && isNotBlank(v.bucketId))
		.map(v => (v as ConvergenceBucketVariable).bucketId)
		.filter(bucketId => isNotBlank(bucketId)) as Array<BucketId>;
};

export const useInitializeBuckets = (convergence: Convergence | null | undefined) => {
	const [initialized, setInitialized] = useState(false);

	const askInitialBucketIds = async (convergence: Convergence): Promise<Array<BucketId>> => {
		// from variables
		const fromVariableBucketIds = askVariableBucketIds(convergence);

		const map: Record<BucketId, boolean> = {};
		fromVariableBucketIds.forEach(bucketId => map[`${bucketId}`] = true);
		return Object.keys(map);
	};

	useAskBuckets({
		convergence,
		shouldStartAsk: () => !initialized,
		detailBucketIds: askInitialBucketIds,
		onLoad: () => setInitialized(true)
	});

	return initialized;
};