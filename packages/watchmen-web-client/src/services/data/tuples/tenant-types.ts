import {OptimisticLock, Tuple} from './tuple-types';

export type TenantId = string;

export interface Tenant extends Tuple, OptimisticLock {
	tenantId: TenantId;
	name: string;
	enableAI: boolean;
}