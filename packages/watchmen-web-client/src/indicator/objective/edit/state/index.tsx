import {useInitializeBuckets} from './use-initialize-buckets';
import {useInitializeIndicators} from './use-initialize-indicators';
import {useInitializeObjective} from './use-initialize-objective';

export const usePrepareObjective = () => {
	// init objective
	const objective = useInitializeObjective();
	// then indicators
	const indicatorsInitialized = useInitializeIndicators(objective);
	// then buckets
	const bucketsInitialized = useInitializeBuckets(objective, indicatorsInitialized);

	return {initialized: bucketsInitialized, objective};
};