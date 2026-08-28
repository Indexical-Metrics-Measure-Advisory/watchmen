import {Tag} from './tag-types';
import {QueryTuple} from './tuple-types';

export interface QueryTag extends Pick<Tag, 'tagId' | 'name' | 'type' | 'description' | 'createdAt' | 'lastModifiedAt'>, QueryTuple {
}
