import { useRef } from 'react';
import { VirtualLink, VirtualObject } from '@/model/ontology';

/**
 * 保持数组引用稳定：仅当 keyOf 算出的逐项 key 序列变化时才返回新数组。
 * 用于把 draft.virtualObjects / virtualLinks 传给 React.memo 的子组件——
 * 与展示无关的编辑（如修改 filter 值）不会改变 id/name 等 key，memo 即可跳过重渲染。
 * 注意：返回旧数组时元素也是旧引用，消费方只能读取 keyOf 覆盖到的字段。
 */
export const useStableArray = <T>(arr: T[], keyOf: (item: T) => string): T[] => {
	const ref = useRef<{ keys: string[]; arr: T[] } | null>(null);
	const keys = arr.map(keyOf);
	const prev = ref.current;
	if (prev && prev.keys.length === keys.length && prev.keys.every((k, i) => k === keys[i])) {
		return prev.arr;
	}
	ref.current = { keys, arr };
	return arr;
};

/**
 * Factor type 把 watchmen 原始 type 归并成 UI 友好的分组标签（数字、时间、文本等）。
 */
export const factorTypeGroup = (rawType: string): string => {
	const t = (rawType || '').toLowerCase();
	if (['number', 'int', 'integer', 'long', 'float', 'double', 'decimal', 'numeric', 'amount', 'money'].includes(t)) {
		return 'number';
	}
	if (['date', 'datetime', 'timestamp', 'time', 'instant'].includes(t)) {
		return 'datetime';
	}
	if (['boolean', 'bool'].includes(t)) {
		return 'boolean';
	}
	if (['text', 'string', 'varchar', 'char', 'object', 'json'].includes(t)) {
		return 'text';
	}
	return t || 'other';
};

export const factorTypeBadgeClass = (group: string): string => {
	switch (group) {
		case 'number': return 'bg-emerald-100 text-emerald-700';
		case 'datetime': return 'bg-sky-100 text-sky-700';
		case 'boolean': return 'bg-amber-100 text-amber-700';
		case 'text': return 'bg-slate-100 text-slate-700';
		default: return 'bg-zinc-100 text-zinc-700';
	}
};

/** 解析 link filter 的 field（"source.col" / "target.col" / "col"）。 */
export const parseLinkFilterField = (raw: string): { side: 'source' | 'target' | 'none'; column: string } => {
	const trimmed = (raw || '').trim();
	const lower = trimmed.toLowerCase();
	if (lower.startsWith('source.')) return { side: 'source', column: trimmed.slice('source.'.length) };
	if (lower.startsWith('target.')) return { side: 'target', column: trimmed.slice('target.'.length) };
	return { side: 'none', column: trimmed };
};

/** 拿到 link source / target 物理表所有可用的列名（来自 primary table 的 fields）。 */
export const getLinkSideFields = (
	link: VirtualLink,
	side: 'source' | 'target',
	virtualObjects: VirtualObject[],
): string[] => {
	const objectId = side === 'source' ? link.sourceObjectId : link.targetObjectId;
	const vo = virtualObjects.find(o => o.id === objectId);
	if (!vo) return [];
	const primary = vo.physicalTables.find(t => t.kind === 'primary');
	return primary?.fields ?? [];
};
