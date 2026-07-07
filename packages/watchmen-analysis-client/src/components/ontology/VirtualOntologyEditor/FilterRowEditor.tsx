import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
	FilterCondition, FilterOperator, filterOperatorConfig,
	filterValueAsString, filterValueAsList,
} from '@/model/ontology';

/**
 * 复用的 filter 行编辑器：渲染 operator 选择 + value 输入 + 删除按钮。
 *
 * 字段（field）选择部分因场景而异（物理表用纯列名；link 用 source./target. 前缀），
 * 由 ``children`` 传入，置于 operator 之前。
 */
export const FilterRowEditor = React.memo<{
	flt: FilterCondition;
	onPatch: (patch: Partial<FilterCondition>) => void;
	onRemove: () => void;
	children?: React.ReactNode;
}>(({ flt, onPatch, onRemove, children }) => {
	const opCfg = filterOperatorConfig[flt.operator] ?? filterOperatorConfig.eq;
	const needsValue = opCfg.needsValue;
	return (
		<div className="flex items-center gap-2 flex-wrap">
			{children}
			<Select value={flt.operator} onValueChange={v => onPatch({ operator: v as FilterOperator })}>
				<SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
				<SelectContent>
					{Object.entries(filterOperatorConfig).map(([key, cfg]) => (
						<SelectItem key={key} value={key}>{cfg.label}</SelectItem>
					))}
				</SelectContent>
			</Select>
			{needsValue === 'single' && (
				<Input
					value={filterValueAsString(flt.value)}
					onChange={e => onPatch({ value: e.target.value })}
					placeholder="constant"
					className="flex-1 min-w-[120px] h-7 text-xs"
				/>
			)}
			{needsValue === 'list' && (
				<Input
					value={filterValueAsList(flt.value).join(',')}
					onChange={e => onPatch({ value: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
					placeholder="v1,v2,v3"
					className="flex-1 min-w-[160px] h-7 text-xs"
				/>
			)}
			{needsValue === 'none' && (
				<span className="text-[10px] text-muted-foreground italic">no value</span>
			)}
			<Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}>
				<Trash2 className="w-3.5 h-3.5 text-red-500" />
			</Button>
		</div>
	);
});
