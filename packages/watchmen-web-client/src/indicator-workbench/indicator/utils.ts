import {Indicator} from '@/services/data/tuples/indicator-types';
import {generateUuid} from '@/services/data/tuples/utils';
import {getCurrentTime} from '@/services/data/utils';

export const createIndicator = (): Indicator => {
	return {
		indicatorId: generateUuid(),
		name: '',
		topicId: '',
		version: 1,
		createdAt: getCurrentTime(),
		lastModifiedAt: getCurrentTime()
	};
};
