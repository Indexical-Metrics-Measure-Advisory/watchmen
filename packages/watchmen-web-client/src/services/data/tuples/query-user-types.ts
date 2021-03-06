import {QueryTuple, QueryTupleForHolder} from './tuple-types';
import {User} from './user-types';

export interface QueryUser extends Pick<User, 'userId' | 'name' | 'createdAt' | 'lastModifiedAt'>, QueryTuple {
}

export interface QueryUserForHolder extends Pick<User, 'userId' | 'name'>, QueryTupleForHolder {
}