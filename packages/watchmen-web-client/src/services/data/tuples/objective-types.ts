import {TenantId} from './tenant-types';
import {OptimisticLock, Tuple} from './tuple-types';
import {UserGroupHolder} from './user-group-types';

export type ObjectiveId = string;

export interface Objective extends Tuple, OptimisticLock, UserGroupHolder {
	objectiveId: ObjectiveId;
	name: string;
	description?: string;
	tenantId?: TenantId;
}
