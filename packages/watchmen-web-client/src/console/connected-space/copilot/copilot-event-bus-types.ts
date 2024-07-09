import {Topic} from '@/services/data/tuples/topic-types';

export enum CopilotEventTypes {
	TOPIC_SELECTED = 'topic-selected',
}

export interface CopilotEventBus {
	fire(type: CopilotEventTypes.TOPIC_SELECTED, topic: Topic): this;
	on(type: CopilotEventTypes.TOPIC_SELECTED, listener: (topic: Topic) => void): this;
	off(type: CopilotEventTypes.TOPIC_SELECTED, listener: (topic: Topic) => void): this;
}