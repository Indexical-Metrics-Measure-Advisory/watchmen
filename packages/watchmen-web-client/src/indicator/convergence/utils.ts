import {Convergence} from '@/services/data/tuples/convergence-types';
import {generateUuid} from '@/services/data/tuples/utils';
import {getCurrentTime} from '@/services/data/utils';

export const createConvergence = (): Convergence => {
	return {
		convergenceId: generateUuid(),
		name: '',
		userGroupIds: [],
		version: 1,
		createdAt: getCurrentTime(),
		lastModifiedAt: getCurrentTime()
	};
};
