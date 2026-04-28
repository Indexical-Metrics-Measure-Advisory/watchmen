import {generateUuid} from './utils';

export type TagId = string;

export interface TagDef {
	tagId: TagId;
	name: string;
	/** 十六进制颜色值，如 '#ff4d4f' */
	color: string;
	/** 可选分类 */
	category?: string;
	/** 可选描述 */
	description?: string;
	/** 创建时间 */
	createdAt?: string;
	/** 最后修改时间 */
	lastModifiedAt?: string;
}

export interface TagCriteria {
	name?: string;
	category?: string;
}

export const TAG_STORAGE_KEY = 'watchmen-dqc-tags';

/** 从 localStorage 读取 Tag 列表 */
export const loadTags = (): Array<TagDef> => {
	try {
		const data = localStorage.getItem(TAG_STORAGE_KEY);
		return data ? JSON.parse(data) : [];
	} catch {
		return [];
	}
};

/** 将 Tag 列表写入 localStorage */
export const saveTags = (tags: Array<TagDef>): void => {
	try {
		localStorage.setItem(TAG_STORAGE_KEY, JSON.stringify(tags));
	} catch (e) {
		console.error('Failed to save tags to localStorage:', e);
	}
};

/** 创建新 Tag，自动生成 tagId 和时间戳 */
export const createTag = (name: string, color: string, category?: string, description?: string): TagDef => {
	const now = new Date().toISOString();
	return {
		tagId: generateUuid(),
		name,
		color,
		category,
		description,
		createdAt: now,
		lastModifiedAt: now
	};
};

/** 预设颜色列表，供颜色选择器使用 */
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
