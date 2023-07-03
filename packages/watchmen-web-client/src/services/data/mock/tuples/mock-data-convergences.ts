import {Convergence} from '../../tuples/convergence-types';
import {getCurrentTime} from '../../utils';

export const A_MOCK_CONVERGENCE_ID = '1';

export const AMockConvergence: Convergence = {
	convergenceId: A_MOCK_CONVERGENCE_ID,
	name: 'Mock Convergence',
	description: '',
	targets: [],
	variables: [],
	userGroupIds: [],
	version: 1,
	createdAt: getCurrentTime(),
	lastModifiedAt: getCurrentTime()
};

export const DemoConvergences = [AMockConvergence];