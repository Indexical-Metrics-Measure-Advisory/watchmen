import {useInitializeBuckets} from './use-initialize-buckets';
import {useInitializeConvergence} from './use-initialize-convergence';
import {useInitializeObjectives} from './use-initialize-objectives';

export const usePrepareConvergence = () => {
	// init objective
	const convergence = useInitializeConvergence();
	// then buckets
	const bucketsInitialized = useInitializeBuckets(convergence);
	// then objectives
	const objectivesInitialized = useInitializeObjectives(convergence);

	return {initialized: bucketsInitialized && objectivesInitialized, convergence};
};
