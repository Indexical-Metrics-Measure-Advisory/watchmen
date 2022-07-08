import {Topic} from './topic-types';
import {QueryTuple, QueryTupleForHolder} from './tuple-types';

export interface QueryTopic extends Pick<Topic, 'topicId' | 'name' | 'type' | 'kind' | 'description' | 'createdAt' | 'lastModifiedAt'>, QueryTuple {
}

export interface QueryTopicForHolder extends Pick<Topic, 'topicId' | 'name'>, QueryTupleForHolder {
}