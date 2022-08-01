import {TenantId} from './tenant-types';
import {OptimisticLock, Tuple} from './tuple-types';

export enum PluginType {
	STREAMLIT = 'streamlit'
}

export enum PluginApplyTo {
	ACHIEVEMENT = 'achievement'
}

export type PluginId = string;

export interface Plugin extends Tuple, OptimisticLock {
	pluginId: PluginId;
	pluginCode: string;
	name: string;
	type: PluginType;
	applyTo: PluginApplyTo;
	params?: Array<string>;
	results?: Array<string>;
	tenantId?: TenantId;
}
