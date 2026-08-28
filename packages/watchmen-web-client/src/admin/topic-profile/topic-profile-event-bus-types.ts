import {Topic} from '@/services/data/tuples/topic-types';

export enum TopicProfileEventTypes {
	SHOW_PROFILE = 'show-profile'
}

export interface TopicProfileEventBus {
	fire(type: TopicProfileEventTypes.SHOW_PROFILE, topic: Topic): this;
	on(type: TopicProfileEventTypes.SHOW_PROFILE, listener: (topic: Topic) => void): this;
	off(type: TopicProfileEventTypes.SHOW_PROFILE, listener: (topic: Topic) => void): this;
}