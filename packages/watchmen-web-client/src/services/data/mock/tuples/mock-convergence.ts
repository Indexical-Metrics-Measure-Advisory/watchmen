import {TuplePage} from '../../query/tuple-page';
import {Convergence, ConvergenceId} from '../../tuples/convergence-types';
import {QueryConvergence, QueryConvergenceForHolder} from '../../tuples/query-convergence-types';
import {isFakedUuid} from '../../tuples/utils';
import {AMockConvergence, DemoConvergences} from './mock-data-convergences';

export const listMockConvergences = async (options: {
	search: string;
	pageNumber?: number;
	pageSize?: number;
}): Promise<TuplePage<QueryConvergence>> => {
	const {pageNumber = 1, pageSize = 9} = options;
	return new Promise<TuplePage<QueryConvergence>>((resolve) => {
		setTimeout(() => {
			resolve({
				data: DemoConvergences,
				itemCount: DemoConvergences.length,
				pageNumber,
				pageSize,
				pageCount: 1
			});
		}, 1000);
	});
};

export const fetchMockConvergence = async (convergenceId: ConvergenceId): Promise<Convergence> => {
	// eslint-disable-next-line
	const found = DemoConvergences.find(({convergenceId: id}) => id == convergenceId);
	if (found) {
		return JSON.parse(JSON.stringify(found));
	} else {
		return {...AMockConvergence, convergenceId};
	}
};

let newConvergenceId = 10000;
export const saveMockConvergence = async (convergence: Convergence): Promise<void> => {
	return new Promise<void>((resolve) => {
		if (isFakedUuid(convergence)) {
			convergence.convergenceId = `${newConvergenceId++}`;
		}
		setTimeout(() => resolve(), 500);
	});
};

export const listMockConvergencesForHolder = async (search: string): Promise<Array<QueryConvergenceForHolder>> => {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve(
				DemoConvergences.filter((x) =>
					x.name.toUpperCase().includes(search.toUpperCase())
				)
			);
		}, 500);
	});
};