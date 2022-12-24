import {TuplePage} from '../../query/tuple-page';
import {Objective, ObjectiveId} from '../../tuples/objective-types';
import {QueryObjective} from '../../tuples/query-objective-types';
import {isFakedUuid} from '../../tuples/utils';
import {DemoObjectives, MonthlySalesObjective} from './mock-data-objectives';

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

export const fetchMockObjective = async (objectiveId: ObjectiveId): Promise<Objective> => {
	// eslint-disable-next-line
	const found = DemoObjectives.find(({objectiveId: id}) => id == objectiveId);
	if (found) {
		return JSON.parse(JSON.stringify(found));
	} else {
		return {...MonthlySalesObjective, objectiveId};
	}
};

let newObjectiveId = 10000;
export const saveMockObjective = async (objective: Objective): Promise<void> => {
	return new Promise<void>((resolve) => {
		if (isFakedUuid(objective)) {
			objective.objectiveId = `${newObjectiveId++}`;
		}
		setTimeout(() => resolve(), 500);
	});
};
