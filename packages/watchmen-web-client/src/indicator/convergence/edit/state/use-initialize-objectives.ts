import {Convergence} from '@/services/data/tuples/convergence-types';
import {ObjectiveId} from '@/services/data/tuples/objective-types';
import {isNotBlank} from '@/services/utils';
import {useState} from 'react';
import {useAskObjectives} from '../hooks/use-ask-objectives';

const askTargetObjectiveIds = (convergence: Convergence): Array<ObjectiveId> => {
	return (convergence.targets || [])
		.filter(v => isNotBlank(v.objectiveId))
		.map(v => v.objectiveId);
};

export const useInitializeObjectives = (convergence: Convergence | null | undefined) => {
	const [initialized, setInitialized] = useState(false);

	const askInitialObjectiveIds = async (convergence: Convergence): Promise<Array<ObjectiveId>> => {
		// from variables
		const fromTargetObjectiveIds = askTargetObjectiveIds(convergence);

		const map: Record<ObjectiveId, boolean> = {};
		fromTargetObjectiveIds.forEach(objectiveId => map[`${objectiveId}`] = true);
		return Object.keys(map);
	};

	useAskObjectives({
		convergence,
		shouldStartAsk: () => !initialized,
		detailObjectiveIds: askInitialObjectiveIds,
		onLoad: () => setInitialized(true)
	});

	return initialized;
};