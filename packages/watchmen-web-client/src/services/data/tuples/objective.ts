import {findAccount} from '../account';
import {Apis, get, page, post} from '../apis';
import {
	askMockObjectiveFactorValue,
	askMockObjectiveValues,
	fetchMockConsanguinity,
	fetchMockObjective,
	listMockObjectives,
	saveMockObjective
} from '../mock/tuples/mock-objective';
import {TuplePage} from '../query/tuple-page';
import {isMockService} from '../utils';
import {Consanguinity} from './consanguinity';
import {Objective, ObjectiveFactor, ObjectiveId, ObjectiveValues} from './objective-types';
import {QueryObjective} from './query-objective-types';
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
		return await post({api: Apis.OBJECTIVE_VALUES});
	}
};

export const fetchConsanguinity = async (objective: Objective): Promise<Consanguinity> => {
	if (isMockService()) {
		return fetchMockConsanguinity(objective);
	} else {
		await saveObjective(objective);
		const all = await Promise.all<Consanguinity>((objective.targets || []).map(async target => {
			return await get({
				api: Apis.OBJECTIVE_FACTOR_CONSANGUINITY,
				search: {objectiveId: objective.objectiveId, targetId: target.uuid}
			});
		}));
		// merge
		return replaceKeys(all.reduce((consanguinity, one) => {
			(Object.keys(one) as Array<keyof Consanguinity>).forEach((key) => {
				if (one[key] == null) {
					return;
				}
				if (consanguinity[key] == null) {
					consanguinity[key] = [];
				}
				// @ts-ignore
				consanguinity[key]!.push(...(one[key]));
			});
			return consanguinity;
		}, {} as Consanguinity), {cid_: '@cid', from_: 'from'});
	}
};