import {ObjectiveFactor} from '@/services/data/tuples/objective-types';

export enum FilterEventTypes {
	TOP_TYPE_CHANGED = 'top-type-changed',
	CONTENT_CHANGED = 'content-changed',
}

export interface FilterEventBus {
	fire(type: FilterEventTypes.TOP_TYPE_CHANGED, factor: ObjectiveFactor): this;
	on(type: FilterEventTypes.TOP_TYPE_CHANGED, listener: (factor: ObjectiveFactor) => void): this;
	off(type: FilterEventTypes.TOP_TYPE_CHANGED, listener: (factor: ObjectiveFactor) => void): this;

	fire(type: FilterEventTypes.CONTENT_CHANGED, factor: ObjectiveFactor): this;
	on(type: FilterEventTypes.CONTENT_CHANGED, listener: (factor: ObjectiveFactor) => void): this;
	off(type: FilterEventTypes.CONTENT_CHANGED, listener: (factor: ObjectiveFactor) => void): this;
}