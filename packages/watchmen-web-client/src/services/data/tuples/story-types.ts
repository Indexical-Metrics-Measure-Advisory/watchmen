import {TenantId} from './tenant-types';
import {OptimisticLock, Tuple} from './tuple-types';

export type StoryId = string;

export enum StoryType {
    markdown = 'markdown',
    notion = 'notion',
    url = 'url'
}


export interface DataStory extends Tuple, OptimisticLock {
    storyId: StoryId;
    name: string;
    type: StoryType;
    description?: string;
    tenantId?: TenantId;
}

