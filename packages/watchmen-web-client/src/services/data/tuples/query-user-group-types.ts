import {QueryTuple, QueryTupleForHolder} from './tuple-types';
import {UserGroup} from './user-group-types';

export interface QueryUserGroup extends Pick<UserGroup, 'userGroupId' | 'name' | 'description' | 'createdAt' | 'lastModifiedAt'>, QueryTuple {
}

export interface QueryUserGroupForHolder extends Pick<UserGroup, 'userGroupId' | 'name'>, QueryTupleForHolder {
}