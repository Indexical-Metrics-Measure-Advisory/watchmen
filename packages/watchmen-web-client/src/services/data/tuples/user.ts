import {findAccount, isSuperAdmin} from '../account';
import {Apis, get, page, post} from '../apis';
import {fetchMockUser, listMockUsers, listMockUsersForHolder, saveMockUser} from '../mock/tuples/mock-user';
import {TuplePage} from '../query/tuple-page';
import {isMockService} from '../utils';
import {QueryTenant} from './query-tenant-types';
import {QueryUserGroupForHolder} from './query-user-group-types';
import {QueryUser, QueryUserForHolder} from './query-user-types';
import {listTenants} from './tenant';
import {UserGroupId} from './user-group-types';
import {User, UserId} from './user-types';
import {isFakedUuid} from './utils';

type UserOnServer = Omit<User, 'userGroupIds'> & { groupIds: Array<UserGroupId> };
const transformFromServer = (user: UserOnServer): User => {
	const {groupIds, ...rest} = user;
	return {userGroupIds: groupIds, ...rest};
};
const transformToServer = (user: User): UserOnServer => {
	const {userGroupIds, ...rest} = user;
	if (!isSuperAdmin()) {
		delete rest.tenantId;
	}
	return {groupIds: userGroupIds, ...rest};
};

export const listUsers = async (options: {
	search: string;
	pageNumber?: number;
	pageSize?: number;
}): Promise<TuplePage<QueryUser>> => {
	const {search = '', pageNumber = 1, pageSize = 9} = options;

	if (isMockService()) {
		return listMockUsers(options);
	} else {
		const pageable: TuplePage<UserOnServer> = await page({
			api: Apis.USER_LIST_BY_NAME,
			search: {search}, pageable: {pageNumber, pageSize}
		});
		return {...pageable, data: (pageable.data || []).map(user => transformFromServer(user))};
	}
};

export const fetchUser = async (userId: UserId, ignoreGroups: boolean = false): Promise<{ user: User; groups: Array<QueryUserGroupForHolder>; tenants: Array<QueryTenant> }> => {
	if (isMockService()) {
		return fetchMockUser(userId);
	} else {
		const user: UserOnServer = await get({api: Apis.USER_GET, search: {userId}});

		let tenants: Array<QueryTenant> = [];
		if (isSuperAdmin()) {
			tenants = (await listTenants({search: '', pageNumber: 1, pageSize: 9999})).data;
		}

		const {groupIds} = user;
		if (!ignoreGroups && groupIds && groupIds.length > 0) {
			const groups = await post({api: Apis.USER_GROUP_BY_IDS, data: groupIds});
			return {user: transformFromServer(user), groups, tenants};
		} else {
			return {user: transformFromServer(user), groups: [], tenants};
		}
	}
};

export const saveUser = async (user: User): Promise<void> => {
	if (!isSuperAdmin()) {
		user.tenantId = findAccount()?.tenantId;
	}

	if (isMockService()) {
		return saveMockUser(user);
	} else if (isFakedUuid(user)) {
		const data = await post({api: Apis.USER_CREATE, data: transformToServer(user)});
		user.userId = data.userId;
		user.version = data.version;
		user.tenantId = data.tenantId ?? user.tenantId;
		user.lastModifiedAt = data.lastModifiedAt;
	} else {
		const data = await post({api: Apis.USER_SAVE, data: transformToServer(user)});
		user.version = data.version;
		user.tenantId = data.tenantId ?? user.tenantId;
		user.lastModifiedAt = data.lastModifiedAt;
	}
};

export const listUsersForHolder = async (search: string): Promise<Array<QueryUserForHolder>> => {
	if (isMockService()) {
		return listMockUsersForHolder(search);
	} else {
		return (await get({api: Apis.USER_LIST_FOR_HOLDER_BY_NAME, search: {search}}))
			.map((user: UserOnServer) => transformFromServer(user));
	}
};
