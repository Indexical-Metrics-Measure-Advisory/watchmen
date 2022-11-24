import {Apis, page} from '@/services/data/apis';
import {listMockObjectives} from '@/services/data/mock/tuples/mock-objective';
import {TuplePage} from '@/services/data/query/tuple-page';
import {QueryObjective} from '@/services/data/tuples/query-objective-types';
import {isMockService} from '@/services/data/utils';

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
