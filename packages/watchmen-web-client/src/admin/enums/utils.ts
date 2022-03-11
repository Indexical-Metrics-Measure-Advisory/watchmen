import {Enum} from '@/services/data/tuples/enum-types';
import {generateUuid} from '@/services/data/tuples/utils';
import {getCurrentTime} from '@/services/data/utils';

export const createEnum = (): Enum => {
	return {
		enumId: generateUuid(),
		name: '',
		items: [],
		version: 1,
		createdAt: getCurrentTime(),
		lastModifiedAt: getCurrentTime()
	};
};
