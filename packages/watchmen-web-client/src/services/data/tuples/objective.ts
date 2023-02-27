import {findAccount} from '../account';
import {Apis, get, page, post} from '../apis';
import {
	askMockObjectiveFactorValue,
	askMockObjectiveValues,
	fetchMockConsanguinity,
	fetchMockObjective,
	listMockObjectives,
	listMockObjectivesForHolder,
	saveMockObjective
} from '../mock/tuples/mock-objective';
import {TuplePage} from '../query/tuple-page';
import {isMockService} from '../utils';
import {redressSubjectsToClientType} from './consanguinity';
import {Consanguinity} from './consanguinity-types';
import {Objective, ObjectiveFactor, ObjectiveId, ObjectiveValues} from './objective-types';
import {QueryObjective, QueryObjectiveForHolder} from './query-objective-types';
import {UserGroupId} from './user-group-types';
import {isFakedUuid, replaceKeys} from './utils';

type ObjectiveOnServer = Omit<Objective, 'userGroupIds'> & { groupIds: Array<UserGroupId> };

const transformFromServer = (objective: ObjectiveOnServer): Objective => {
	const {groupIds, ...rest} = objective;
	return {userGroupIds: groupIds, ...rest};
};
const transformToServer = (objective: Objective): ObjectiveOnServer => {
	const {userGroupIds, ...rest} = objective;
	return {
		groupIds: userGroupIds,
		...rest
	};
};

export const listObjectives = async (options: {
	search: string;
	pageNumber?: number;
	pageSize?: number;
}): Promise<TuplePage<QueryObjective>> => {
	const {search = '', pageNumber = 1, pageSize = 9} = options;

	if (isMockService()) {
		return listMockObjectives(options);
	} else {
		const pageable: TuplePage<ObjectiveOnServer> = await page({
			api: Apis.OBJECTIVE_LIST_BY_NAME,
			search: {search}, pageable: {pageNumber, pageSize}
		});
		return {...pageable, data: (pageable.data || []).map(objective => transformFromServer(objective))};

	}
};

export const listObjectivesForHolder = async (search: string): Promise<Array<QueryObjectiveForHolder>> => {
	if (isMockService()) {
		return listMockObjectivesForHolder(search);
	} else {
		return (await get({api: Apis.OBJECTIVE_LIST_FOR_HOLDER_BY_NAME, search: {search}}))
			.map((objective: ObjectiveOnServer) => transformFromServer(objective));
	}
};

export const fetchObjective = async (objectiveId: ObjectiveId): Promise<Objective> => {
	if (isMockService()) {
		return await fetchMockObjective(objectiveId);
	} else {
		const objective = await get({api: Apis.OBJECTIVE_GET, search: {objectiveId}});
		return transformFromServer(objective);
	}
};

export const saveObjective = async (objective: Objective): Promise<void> => {
	objective.tenantId = findAccount()?.tenantId;
	if (isMockService()) {
		return saveMockObjective(objective);
	} else if (isFakedUuid(objective)) {
		const data = await post({api: Apis.OBJECTIVE_CREATE, data: transformToServer(objective)});
		objective.objectiveId = data.objectiveId;
		objective.tenantId = data.tenantId;
		objective.version = data.version;
		objective.lastModifiedAt = data.lastModifiedAt;
	} else {
		const data = await post({api: Apis.OBJECTIVE_SAVE, data: transformToServer(objective)});
		objective.tenantId = data.tenantId;
		objective.version = data.version;
		objective.lastModifiedAt = data.lastModifiedAt;
	}
};

export const askObjectiveFactorValue = async (objective: Objective, factor: ObjectiveFactor): Promise<{ value?: number }> => {
	if (isMockService()) {
		return askMockObjectiveFactorValue(objective, factor);
	} else {
		return await post({
			api: Apis.OBJECTIVE_FACTOR_VALUE,
			data: {objective: transformToServer(objective), factor}
		});
	}
};

export const askObjectiveValues = async (objective: Objective): Promise<ObjectiveValues> => {
	if (isMockService()) {
		return askMockObjectiveValues(objective);
	} else {
		return await post({api: Apis.OBJECTIVE_VALUES, data: transformToServer(objective)});
	}
};

export const fetchConsanguinity = async (objective: Objective): Promise<Consanguinity> => {
	if (isMockService()) {
		return fetchMockConsanguinity(objective);
	} else {
		await saveObjective(objective);
		const data = await get({api: Apis.OBJECTIVE_CONSANGUINITY, search: {objectiveId: objective.objectiveId}});
		// merge
		return replaceKeys(redressSubjectsToClientType(data), {cid_: '@cid', from_: 'from'});
	}
};