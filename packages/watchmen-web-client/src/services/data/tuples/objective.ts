import {Apis, get, page} from '../apis';
import {fetchMockObjective, listMockObjectives} from '../mock/tuples/mock-objective';
import {TuplePage} from '../query/tuple-page';
import {isMockService} from '../utils';
import {Objective, ObjectiveId} from './objective-types';
import {QueryObjective} from './query-objective-types';

export const listObjectives = async (options: {
	search: string;
	pageNumber?: number;
	pageSize?: number;
}): Promise<TuplePage<QueryObjective>> => {
	const {search = '', pageNumber = 1, pageSize = 9} = options;

	if (isMockService()) {
		return listMockObjectives(options);
	} else {
		return await page({api: Apis.OBJECTIVE_LIST_BY_NAME, search: {search}, pageable: {pageNumber, pageSize}});
	}
};

export const fetchObjective = async (objectiveId: ObjectiveId): Promise<{ objective: Objective }> => {
	if (isMockService()) {
		return await fetchMockObjective(objectiveId);
	} else {
		const objective: Objective = await get({api: Apis.OBJECTIVE_GET, search: {objectiveId}});
		return {objective};
	}
};