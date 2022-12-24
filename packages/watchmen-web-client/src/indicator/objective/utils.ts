import {Objective} from '@/services/data/tuples/objective-types';
import {generateUuid} from '@/services/data/tuples/utils';
import {getCurrentTime} from '@/services/data/utils';

export const createObjective = (): Objective => {
	return {
		objectiveId: generateUuid(),
		name: '',
		userGroupIds: [],
		version: 1,
		createdAt: getCurrentTime(),
		lastModifiedAt: getCurrentTime()
	};
};
