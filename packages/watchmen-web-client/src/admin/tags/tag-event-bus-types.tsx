import {Tag} from '@/services/data/tuples/tag-types';

export enum TagEventTypes {
	TAG_NAME_CHANGED = 'tag-name-changed',
	TAG_TYPE_CHANGED = 'tag-type-changed',
	TAG_DESCRIPTION_CHANGED = 'tag-description-changed'
}

export interface TagEventBus {
	fire(type: TagEventTypes.TAG_NAME_CHANGED, tag: Tag): this;
	on(type: TagEventTypes.TAG_NAME_CHANGED, listener: (tag: Tag) => void): this;
	off(type: TagEventTypes.TAG_NAME_CHANGED, listener: (tag: Tag) => void): this;

	fire(type: TagEventTypes.TAG_TYPE_CHANGED, tag: Tag): this;
	on(type: TagEventTypes.TAG_TYPE_CHANGED, listener: (tag: Tag) => void): this;
	off(type: TagEventTypes.TAG_TYPE_CHANGED, listener: (tag: Tag) => void): this;

	fire(type: TagEventTypes.TAG_DESCRIPTION_CHANGED, tag: Tag): this;
	on(type: TagEventTypes.TAG_DESCRIPTION_CHANGED, listener: (tag: Tag) => void): this;
	off(type: TagEventTypes.TAG_DESCRIPTION_CHANGED, listener: (tag: Tag) => void): this;
}
