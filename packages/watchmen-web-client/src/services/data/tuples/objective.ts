import {findAccount} from '../account';
import {Apis, get, page, post} from '../apis';
import {fetchMockObjective, listMockObjectives, saveMockObjective} from '../mock/tuples/mock-objective';
import {TuplePage} from '../query/tuple-page';
import {isMockService} from '../utils';
import {Objective, ObjectiveId} from './objective-types';
import {QueryObjective} from './query-objective-types';
import {isFakedUuid} from './utils';

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

export const fetchObjective = async (objectiveId: ObjectiveId): Promise<Objective> => {
	if (isMockService()) {
		return await fetchMockObjective(objectiveId);
	} else {
		return await get({api: Apis.OBJECTIVE_GET, search: {objectiveId}});
	}
};

export const saveObjective = async (objective: Objective): Promise<void> => {
	objective.tenantId = findAccount()?.tenantId;
	if (isMockService()) {
		return saveMockObjective(objective);
	} else if (isFakedUuid(objective)) {
		const data = await post({api: Apis.OBJECTIVE_CREATE, data: objective});
		objective.objectiveId = data.objectiveId;
		objective.tenantId = data.tenantId;
		objective.version = data.version;
		objective.lastModifiedAt = data.lastModifiedAt;
	} else {
		const data = await post({api: Apis.OBJECTIVE_SAVE, data: objective});
		objective.tenantId = data.tenantId;
		objective.version = data.version;
		objective.lastModifiedAt = data.lastModifiedAt;
	}
};
