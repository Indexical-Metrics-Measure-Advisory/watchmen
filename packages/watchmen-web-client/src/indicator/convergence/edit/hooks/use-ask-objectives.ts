import {Convergence} from '@/services/data/tuples/convergence-types';
import {Objective, ObjectiveId} from '@/services/data/tuples/objective-types';
import {QueryObjective} from '@/services/data/tuples/query-objective-types';
import {useEffect} from 'react';
import {useConvergencesEventBus} from '../../convergences-event-bus';
import {ConvergencesEventTypes} from '../../convergences-event-bus-types';

export const useAskObjectives = (options: {
	convergence?: Convergence | null;
	shouldStartAsk: () => boolean;
	// keep it unchanged
	detailObjectiveIds: (convergence: Convergence) => Promise<Array<ObjectiveId>>;
	// keep it unchanged
	onLoad: (all: Array<QueryObjective>, details: Array<Objective>) => void;
}) => {
	const {convergence, shouldStartAsk, detailObjectiveIds, onLoad} = options;

	const {fire} = useConvergencesEventBus();

	useEffect(() => {
		if (convergence == null || !shouldStartAsk()) {
			return;
		}
		fire(ConvergencesEventTypes.ASK_ALL_OBJECTIVES, async (all: Array<QueryObjective>) => {
			if (all.length === 0) {
				// no objective
				onLoad(all, []);
			} else {
				const objectiveIds: Array<ObjectiveId> = await detailObjectiveIds(convergence);
				fire(ConvergencesEventTypes.ASK_OBJECTIVES, objectiveIds, (details: Array<Objective>) => {
					onLoad(all, details);
				});
			}
		});
	}, [fire, convergence, shouldStartAsk, detailObjectiveIds, onLoad]);
};