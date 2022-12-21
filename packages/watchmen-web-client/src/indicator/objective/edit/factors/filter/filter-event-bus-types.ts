import {ConditionalObjectiveParameter} from '@/services/data/tuples/objective-types';

export enum FilterEventTypes {
	TOP_TYPE_CHANGED = 'top-type-changed',
	CONTENT_CHANGED = 'content-changed',
}

export interface FilterEventBus {
	fire(type: FilterEventTypes.TOP_TYPE_CHANGED, conditional: ConditionalObjectiveParameter): this;
	on(type: FilterEventTypes.TOP_TYPE_CHANGED, listener: (conditional: ConditionalObjectiveParameter) => void): this;
	off(type: FilterEventTypes.TOP_TYPE_CHANGED, listener: (conditional: ConditionalObjectiveParameter) => void): this;

	fire(type: FilterEventTypes.CONTENT_CHANGED, conditional: ConditionalObjectiveParameter): this;
	on(type: FilterEventTypes.CONTENT_CHANGED, listener: (conditional: ConditionalObjectiveParameter) => void): this;
	off(type: FilterEventTypes.CONTENT_CHANGED, listener: (conditional: ConditionalObjectiveParameter) => void): this;
}