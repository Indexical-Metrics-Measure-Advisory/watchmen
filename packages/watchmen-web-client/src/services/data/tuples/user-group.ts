import {findAccount} from '../account';
import {Apis, get, page, post} from '../apis';
import {
	fetchMockUserGroup,
	fetchMockUserGroupsByIds,
	listMockUserGroups,
	listMockUserGroupsForSpace,
	saveMockUserGroup
} from '../mock/tuples/mock-user-group';
import {TuplePage} from '../query/tuple-page';
import {isMockService} from '../utils';
import {QueryConvergenceForHolder} from './query-convergence-types';
import {QueryObjectiveForHolder} from './query-objective-types';
import {QuerySpaceForHolder} from './query-space-types';
import {QueryUserGroup, QueryUserGroupForHolder} from './query-user-group-types';
import {QueryUserForHolder} from './query-user-types';
import {UserGroup, UserGroupId} from './user-group-types';
import {isFakedUuid} from './utils';

export const listUserGroups = async (options: {
	search: string;
	pageNumber?: number;
	pageSize?: number;
}): Promise<TuplePage<QueryUserGroup>> => {
	const {search = '', pageNumber = 1, pageSize = 9} = options;

	if (isMockService()) {
		return listMockUserGroups(options);
	} else {
		return await page({
			api: Apis.USER_GROUP_LIST_BY_NAME,
			search: {search},
			pageable: {pageNumber, pageSize}
		});
	}
};

export const fetchUserGroup = async (
	userGroupId: UserGroupId
): Promise<{
	userGroup: UserGroup;
	users: Array<QueryUserForHolder>;
	spaces: Array<QuerySpaceForHolder>;
	objectives: Array<QueryObjectiveForHolder>;
	convergences: Array<QueryConvergenceForHolder>;
}> => {
	if (isMockService()) {
		return fetchMockUserGroup(userGroupId);
	} else {
		const userGroup: UserGroup = await get({api: Apis.USER_GROUP_GET, search: {userGroupId}});

		const fetchUsers = async (): Promise<Array<QueryUserForHolder>> => {
			const {userIds} = userGroup;
			if (userIds && userIds.length > 0) {
				return await post({api: Apis.USER_BY_IDS, data: userIds});
			} else {
				return [];
			}
		};
		const fetchSpaces = async (): Promise<Array<QuerySpaceForHolder>> => {
			const {spaceIds} = userGroup;
			if (spaceIds && spaceIds.length > 0) {
				return await post({api: Apis.SPACE_BY_IDS, data: spaceIds});
			} else {
				return [];
			}
		};
		const fetchObjectives = async (): Promise<Array<QueryObjectiveForHolder>> => {
			const {objectiveIds} = userGroup;
			if (objectiveIds && objectiveIds.length > 0) {
				return await post({api: Apis.OBJECTIVE_BY_IDS, data: objectiveIds});
			} else {
				return [];
			}
		};
		const fetchConvergences = async (): Promise<Array<QueryConvergenceForHolder>> => {
			const {convergenceIds} = userGroup;
			if (convergenceIds && convergenceIds.length > 0) {
				return await post({api: Apis.CONVERGENCE_BY_IDS, data: convergenceIds});
			} else {
				return [];
			}
		};

		const [
			users, spaces, objectives, convergences
		] = await Promise.all([
			fetchUsers(), fetchSpaces(), fetchObjectives(), fetchConvergences()
		]);

		return {userGroup, users, spaces, objectives, convergences};
	}
};

export const saveUserGroup = async (userGroup: UserGroup): Promise<void> => {
	userGroup.tenantId = findAccount()?.tenantId;
	if (isMockService()) {
		return saveMockUserGroup(userGroup);
	} else if (isFakedUuid(userGroup)) {
		const data = await post({api: Apis.USER_GROUP_CREATE, data: userGroup});
		userGroup.userGroupId = data.userGroupId;
		userGroup.version = data.version;
		userGroup.tenantId = data.tenantId;
		userGroup.lastModifiedAt = data.lastModifiedAt;
	} else {
		const data = await post({
			api: Apis.USER_GROUP_SAVE,
			data: userGroup
		});
		userGroup.version = data.version;
		userGroup.tenantId = data.tenantId;
		userGroup.lastModifiedAt = data.lastModifiedAt;
	}
};

export const listUserGroupsForHolder = async (search: string): Promise<Array<QueryUserGroupForHolder>> => {
	if (isMockService()) {
		return listMockUserGroupsForSpace(search);
	} else {
		return await get({api: Apis.USER_GROUP_LIST_FOR_HOLDER_BY_NAME, search: {search}});
	}
};

export const fetchUserGroupsByIds = async (userGroupIds: Array<UserGroupId>): Promise<Array<QueryUserGroupForHolder>> => {
	if (isMockService()) {
		return fetchMockUserGroupsByIds();
	} else {
		return await post({api: Apis.USER_GROUP_BY_IDS, data: userGroupIds});
	}

};