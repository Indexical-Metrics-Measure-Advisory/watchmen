import {useInitializeBuckets} from './use-initialize-buckets';
import {useInitializeIndicators} from './use-initialize-indicators';
import {useInitializeObjective} from './use-initialize-objective';
import {useInitializeSubjects} from './use-initialize-subjects';
import {useInitializeTopics} from './use-initialize-topics';

export const usePrepareObjective = () => {
	// init objective
	const objective = useInitializeObjective();
	// then indicators
	const indicatorsInitialized = useInitializeIndicators(objective);
	// then topic and subject
	const topicsInitialized = useInitializeTopics(objective, indicatorsInitialized);
	const subjectsInitialized = useInitializeSubjects(objective, indicatorsInitialized);
	// then buckets
	const bucketsInitialized = useInitializeBuckets(objective, topicsInitialized && subjectsInitialized);

	return {initialized: bucketsInitialized, objective};
};