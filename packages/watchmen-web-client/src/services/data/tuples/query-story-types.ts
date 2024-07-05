import {Tenant} from './tenant-types';
import {QueryTuple, QueryTupleForHolder} from './tuple-types';
import {DataStory} from "@/services/data/tuples/story-types";

export interface QueryStory extends Pick<DataStory, 'storyId'| 'name' | 'createdAt' | 'lastModifiedAt'>, QueryTuple {
}

export interface QueryStoryForHolder extends Tenant, QueryTupleForHolder {
}