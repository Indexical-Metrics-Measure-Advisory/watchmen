import {generateUuid} from '@/services/data/tuples/utils';
import {getCurrentTime} from '@/services/data/utils';
import {DataStory, StoryType} from "@/services/data/tuples/story-types";

export const createStory = (): DataStory => {
	return {
		storyId: generateUuid(),
		name: '',
		type:StoryType.markdown,
		version: 1,
		createdAt: getCurrentTime(),
		lastModifiedAt: getCurrentTime()
	};
};
