import {Tag, TagType} from '@/services/data/tuples/tag-types';
import {generateUuid} from '@/services/data/tuples/utils';
import {getCurrentTime} from '@/services/data/utils';

export const createTag = (): Tag => {
	return {
		tagId: generateUuid(),
		name: '',
		type: TagType.TOPIC,
		version: 1,
		createdAt: getCurrentTime(),
		lastModifiedAt: getCurrentTime()
	};
};
