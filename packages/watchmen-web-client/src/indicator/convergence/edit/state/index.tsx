import {useInitializeBuckets} from './use-initialize-buckets';
import {useInitializeConvergence} from './use-initialize-convergence';

export const usePrepareConvergence = () => {
	// init objective
	const convergence = useInitializeConvergence();
	// then topic and subject
	// then buckets
	const bucketsInitialized = useInitializeBuckets(convergence);

	return {initialized: bucketsInitialized, convergence};
};
