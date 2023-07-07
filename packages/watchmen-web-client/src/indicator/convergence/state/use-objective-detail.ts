import {fetchObjective, fetchObjectivesByIds} from '@/services/data/tuples/objective';
import {Objective, ObjectiveId} from '@/services/data/tuples/objective-types';
import {useEffect, useState} from 'react';
import {useConvergencesEventBus} from '../convergences-event-bus';
import {ConvergencesEventTypes} from '../convergences-event-bus-types';

type Objectives = Record<ObjectiveId, Objective>

export const useObjectiveDetail = () => {
	const {on, off} = useConvergencesEventBus();
	const [objectives] = useState<Objectives>({});
	useEffect(() => {
		const onAskObjectiveDetails = async (objectiveIds: Array<ObjectiveId>, onData: (objectives: Array<Objective>) => void) => {
			if (objectiveIds.length === 0) {
				onData([]);
			} else {
				// filter the objective which didn't load yet
				// eslint-disable-next-line
				const lackedObjectiveIds = objectiveIds.filter(objectiveId => objectives[`${objectiveId}`] == null);
				const lackedObjectives = await fetchObjectivesByIds(lackedObjectiveIds);
				// sync to state
				lackedObjectives.map(objective => objectives[`${objective.objectiveId}`] = objective);
				onData(objectiveIds.map(objectiveId => objectives[`${objectiveId}`]).filter(objective => objective != null));
			}
		};
		const onAskObjective = async (objectiveId: ObjectiveId, onData: (objective: Objective) => void) => {
			// eslint-disable-next-line
			const found = objectives[`${objectiveId}`];
			if (found != null) {
				onData(found);
			} else {
				const objective = await fetchObjective(objectiveId);
				// sync to state
				objectives[`${objective.objectiveId}`] = objective;
				onData(objective);
			}
		};
		on(ConvergencesEventTypes.ASK_OBJECTIVES, onAskObjectiveDetails);
		on(ConvergencesEventTypes.ASK_OBJECTIVE, onAskObjective);
		return () => {
			off(ConvergencesEventTypes.ASK_OBJECTIVES, onAskObjectiveDetails);
			off(ConvergencesEventTypes.ASK_OBJECTIVE, onAskObjective);
		};
	}, [on, off, objectives]);
};