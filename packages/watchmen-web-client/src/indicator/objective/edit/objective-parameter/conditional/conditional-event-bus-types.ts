import {ConditionalObjectiveParameter} from '@/services/data/tuples/objective-types';

export enum ConditionalEventTypes {
	TOP_TYPE_CHANGED = 'top-type-changed',
	CONTENT_CHANGED = 'content-changed',
}

export interface ConditionalEventBus {
	fire(type: ConditionalEventTypes.TOP_TYPE_CHANGED, conditional: ConditionalObjectiveParameter): this;
	on(type: ConditionalEventTypes.TOP_TYPE_CHANGED, listener: (conditional: ConditionalObjectiveParameter) => void): this;
	off(type: ConditionalEventTypes.TOP_TYPE_CHANGED, listener: (conditional: ConditionalObjectiveParameter) => void): this;

	fire(type: ConditionalEventTypes.CONTENT_CHANGED, conditional: ConditionalObjectiveParameter): this;
	on(type: ConditionalEventTypes.CONTENT_CHANGED, listener: (conditional: ConditionalObjectiveParameter) => void): this;
	off(type: ConditionalEventTypes.CONTENT_CHANGED, listener: (conditional: ConditionalObjectiveParameter) => void): this;
}