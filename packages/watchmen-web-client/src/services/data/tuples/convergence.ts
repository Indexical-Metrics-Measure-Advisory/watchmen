import {findAccount} from '../account';
import {Apis, get, page, post} from '../apis';
import {
	fetchMockConvergence,
	listMockConvergences,
	listMockConvergencesForHolder,
	saveMockConvergence
} from '../mock/tuples/mock-convergence';
import {TuplePage} from '../query/tuple-page';
import {isMockService} from '../utils';
import {Convergence, ConvergenceId} from './convergence-types';
import {QueryConvergence, QueryConvergenceForHolder} from './query-convergence-types';
import {UserGroupId} from './user-group-types';
import {isFakedUuid} from './utils';

type ConvergenceOnServer = Omit<Convergence, 'userGroupIds'> & { groupIds: Array<UserGroupId> };

const transformFromServer = (convergence: ConvergenceOnServer): Convergence => {
	const {groupIds, ...rest} = convergence;
	return {userGroupIds: groupIds, ...rest};
};
export const transformToServer = (convergence: Convergence): ConvergenceOnServer => {
	const {userGroupIds, ...rest} = convergence;
	return {
		groupIds: userGroupIds,
		...rest
	};
};

export const listConvergences = async (options: {
	search: string;
	pageNumber?: number;
	pageSize?: number;
}): Promise<TuplePage<QueryConvergence>> => {
	const {search = '', pageNumber = 1, pageSize = 9} = options;

	if (isMockService()) {
		return listMockConvergences(options);
	} else {
		const pageable: TuplePage<ConvergenceOnServer> = await page({
			api: Apis.CONVERGENCE_LIST_BY_NAME,
			search: {search}, pageable: {pageNumber, pageSize}
		});
		return {...pageable, data: (pageable.data || []).map(convergence => transformFromServer(convergence))};

	}
};

export const listConvergencesForHolder = async (search: string): Promise<Array<QueryConvergenceForHolder>> => {
	if (isMockService()) {
		return listMockConvergencesForHolder(search);
	} else {
		return (await get({api: Apis.CONVERGENCE_LIST_FOR_HOLDER_BY_NAME, search: {search}}))
			.map((convergence: ConvergenceOnServer) => transformFromServer(convergence));
	}
};

export const fetchConvergence = async (convergenceId: ConvergenceId): Promise<Convergence> => {
	if (isMockService()) {
		return await fetchMockConvergence(convergenceId);
	} else {
		const convergence = await get({api: Apis.CONVERGENCE_GET, search: {convergenceId}});
		return transformFromServer(convergence);
	}
};

export const saveConvergence = async (convergence: Convergence): Promise<void> => {
	convergence.tenantId = findAccount()?.tenantId;
	if (isMockService()) {
		return saveMockConvergence(convergence);
	} else if (isFakedUuid(convergence)) {
		const data = await post({api: Apis.CONVERGENCE_CREATE, data: transformToServer(convergence)});
		convergence.convergenceId = data.convergenceId;
		convergence.tenantId = data.tenantId;
		convergence.version = data.version;
		convergence.lastModifiedAt = data.lastModifiedAt;
	} else {
		const data = await post({api: Apis.CONVERGENCE_SAVE, data: transformToServer(convergence)});
		convergence.tenantId = data.tenantId;
		convergence.version = data.version;
		convergence.lastModifiedAt = data.lastModifiedAt;
	}
};
