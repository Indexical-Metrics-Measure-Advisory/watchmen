import {TenantId} from './tenant-types';
import {OptimisticLock, Tuple} from './tuple-types';

export type TagId = string;

export enum TagType {
	TOPIC = 'topic',
	SUBJECT = 'subject',
	INDICATOR = 'indicator'
}

export interface Tag extends Tuple, OptimisticLock {
	tagId: TagId;
	name: string;
	type: TagType;
	description?: string;
	tenantId?: TenantId;
}

/**
 * 预设颜色列表。admin tags carry no color; DQC widgets derive a stable color
 * from the tag name via these presets.
 */
export const PRESET_COLORS = [
	'#ff4d4f', // 红
	'#fa8c16', // 橙
	'#faad14', // 黄
	'#52c41a', // 绿
	'#1890ff', // 蓝
	'#2f54eb', // 深蓝
	'#722ed1', // 紫
	'#eb2f96', // 粉
	'#13c2c2', // 青
	'#a0d911', // 酸橙
];
