import {listObjectives} from '@/services/data/tuples/objective';
import {ObjectiveId} from '@/services/data/tuples/objective-types';
import {QueryObjective} from '@/services/data/tuples/query-objective-types';
import {useEffect, useState} from 'react';
import {useConvergencesEventBus} from '../convergences-event-bus';
import {ConvergencesEventTypes} from '../convergences-event-bus-types';

interface AllObjectivesState {
	loaded: boolean;
	data: Record<ObjectiveId, QueryObjective>;
}

export const useAllObjectives = () => {
	const {on, off} = useConvergencesEventBus();
	const [objectives, setObjectives] = useState<AllObjectivesState>({loaded: false, data: {}});

	useEffect(() => {
		const onAskObjectives = async (onData: (objectives: Array<QueryObjective>) => void) => {
			if (!objectives.loaded) {
				const data = (await listObjectives({search: '', pageNumber: 1, pageSize: 9999})).data;
				setObjectives({
					loaded: true, data: data.reduce((map, objective) => {
						map[`${objective.objectiveId}`] = objective;
						return map;
					}, {} as Record<ObjectiveId, QueryObjective>)
				});
				onData(data);
			} else {
				onData(Object.values(objectives.data));
			}
		};
		on(ConvergencesEventTypes.ASK_ALL_OBJECTIVES, onAskObjectives);
		return () => {
			off(ConvergencesEventTypes.ASK_ALL_OBJECTIVES, onAskObjectives);
		};
	}, [on, off, objectives]);
};