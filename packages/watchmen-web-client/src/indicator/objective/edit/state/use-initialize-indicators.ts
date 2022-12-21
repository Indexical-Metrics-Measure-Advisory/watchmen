import {Objective} from '@/services/data/tuples/objective-types';
import {useState} from 'react';
import {useAskIndicators} from '../hooks/use-ask-indicators';

export const useInitializeIndicators = (objective?: Objective | null) => {
	const [initialized, setInitialized] = useState(false);
	useAskIndicators({
		objective,
		shouldStartAsk: () => !initialized,
		onLoad: () => setInitialized(true)
	});

	return initialized;
};