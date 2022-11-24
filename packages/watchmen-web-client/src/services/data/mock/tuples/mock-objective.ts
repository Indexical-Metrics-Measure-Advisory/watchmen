import {DemoObjectives, MonthlySalesObjective} from '@/services/data/mock/tuples/mock-data-objectives';
import {TuplePage} from '@/services/data/query/tuple-page';
import {QueryObjective} from '@/services/data/tuples/query-objective-types';
import {Objective, ObjectiveId} from '../../tuples/objective-types';

export const listMockObjectives = async (options: {
	search: string;
	pageNumber?: number;
	pageSize?: number;
}): Promise<TuplePage<QueryObjective>> => {
	const {pageNumber = 1, pageSize = 9} = options;
	return new Promise<TuplePage<QueryObjective>>((resolve) => {
		setTimeout(() => {
			resolve({
				data: DemoObjectives,
				itemCount: DemoObjectives.length,
				pageNumber,
				pageSize,
				pageCount: 1
			});
		}, 1000);
	});
};

export const fetchMockObjective = async (objectiveId: ObjectiveId): Promise<{ objective: Objective }> => {
	// eslint-disable-next-line
	const found = DemoObjectives.find(({objectiveId: id}) => id == objectiveId);
	if (found) {
		const objective: Objective = JSON.parse(JSON.stringify(found));
		return {objective};
	} else {
		return {
			objective: {
				...MonthlySalesObjective,
				objectiveId
			}
		};
	}
};
