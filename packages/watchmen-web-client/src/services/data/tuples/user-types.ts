import {TenantId} from './tenant-types';
import {OptimisticLock, Tuple, TupleHolder} from './tuple-types';
import {UserGroupHolder} from './user-group-types';

export enum UserRole {
	CONSOLE = 'console',
	ADMIN = 'admin',
	SUPER_ADMIN = 'superadmin'
}

export type UserId = string;

export interface User extends Tuple, OptimisticLock, UserGroupHolder {
	userId: UserId;
	name: string;
	role: UserRole;
	nickName: string;
	password: string;
	email?: string;
	isActive?: boolean;
	// only works on super admin login. otherwise, it is undefined
	tenantId?: TenantId;
}

export interface UserHolder extends TupleHolder {
	userIds: Array<UserId>;
}