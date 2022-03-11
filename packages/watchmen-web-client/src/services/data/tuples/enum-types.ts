import {TenantId} from './tenant-types';
import {OptimisticLock, Tuple} from './tuple-types';

export interface EnumItem {
	code: string;
	label: string;
	replaceCode?: string;
	parentCode?: string;
}

export type EnumId = string;

export interface Enum extends Tuple, OptimisticLock {
	enumId: EnumId;
	name: string;
	description?: string;
	parentEnumId?: EnumId;
	items: Array<EnumItem>;
	tenantId?: TenantId;
}
