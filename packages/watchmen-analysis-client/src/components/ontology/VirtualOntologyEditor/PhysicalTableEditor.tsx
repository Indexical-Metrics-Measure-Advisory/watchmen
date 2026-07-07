import React from 'react';
import { Plus, Trash2, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Topic } from '@/services/topicService';
import {
	FilterCondition, PhysicalTableMapping,
	physicalTableJoinTypeConfig, physicalTableKindConfig,
} from '@/model/ontology';
import { factorTypeBadgeClass, factorTypeGroup } from './utils';
import { FilterRowEditor } from './FilterRowEditor';

interface Props {
	voId: string;
	pt: PhysicalTableMapping;
	ptIdx: number;
	primaryFields: string[];
	topicMap: Map<string, Topic>;
	onUpdate: (voId: string, idx: number, patch: Partial<PhysicalTableMapping>) => void;
	onRemove: (voId: string, idx: number) => void;
	onAddJoinCondition: (voId: string, tableIdx: number) => void;
	onUpdateJoinCondition: (
		voId: string, tableIdx: number, conditionIdx: number,
		patch: Partial<{ sourceField: string; targetField: string }>,
	) => void;
	onRemoveJoinCondition: (voId: string, tableIdx: number, conditionIdx: number) => void;
	onAddFilter: (voId: string, tableIdx: number) => void;
	onUpdateFilter: (voId: string, tableIdx: number, filterIdx: number, patch: Partial<FilterCondition>) => void;
	onRemoveFilter: (voId: string, tableIdx: number, filterIdx: number) => void;
}

const PhysicalTableEditorImpl: React.FC<Props> = ({
	voId, pt, ptIdx, primaryFields, topicMap,
	onUpdate, onRemove, onAddJoinCondition, onUpdateJoinCondition, onRemoveJoinCondition,
	onAddFilter, onUpdateFilter, onRemoveFilter,
}) => {
	const isPrimary = pt.kind === 'primary';
	const tableFields = pt.fields.length > 0 ? pt.fields : (topicMap.get(pt.topicId)?.factors?.map(f => f.name) ?? []);

	return (
		<div className="space-y-2 p-2 rounded-md bg-muted/20">
			<div className="flex items-center gap-2">
				<Database className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
				<span className="text-sm font-medium min-w-[120px] truncate" title={pt.topicName}>{pt.topicName}</span>
				<Input
					value={pt.alias || ''}
					onChange={e => onUpdate(voId, ptIdx, { alias: e.target.value })}
					placeholder="alias"
					className="w-20 h-7 text-xs"
				/>
				<Select value={pt.kind} onValueChange={v => onUpdate(voId, ptIdx, { kind: v as PhysicalTableMapping['kind'] })}>
					<SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
					<SelectContent>
						{Object.entries(physicalTableKindConfig).map(([key, cfg]) => (
							<SelectItem key={key} value={key}>{cfg.icon} {cfg.label}</SelectItem>
						))}
					</SelectContent>
				</Select>
				{pt.kind !== 'primary' && (
					<Select
						value={pt.joinType ?? physicalTableKindConfig[pt.kind].defaultJoinType}
						onValueChange={v => onUpdate(voId, ptIdx, { joinType: v as PhysicalTableMapping['joinType'] })}
					>
						<SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
						<SelectContent>
							{Object.entries(physicalTableJoinTypeConfig).map(([key, cfg]) => (
								<SelectItem key={key} value={key}>{cfg.label}</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}
				<div className="flex-1 space-y-1">
					{(() => {
						const factors = topicMap.get(pt.topicId)?.factors ?? [];
						const groups: Record<string, typeof factors> = {};
						factors.forEach(f => {
							const key = factorTypeGroup(f.type);
							(groups[key] = groups[key] || []).push(f);
						});
						const sortedGroups = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
						return sortedGroups.map(([groupName, items]) => (
							<div key={groupName} className="flex items-center gap-1 flex-wrap">
								<span className={cn('text-[9px] px-1 py-0.5 rounded font-mono uppercase shrink-0', factorTypeBadgeClass(groupName))}>{groupName}</span>
								{items.map(f => (
									<button
										key={f.factorId}
										title={`${f.name} · ${f.type}`}
										onClick={() => {
											const fields = pt.fields.includes(f.name)
												? pt.fields.filter(x => x !== f.name)
												: [...pt.fields, f.name];
											onUpdate(voId, ptIdx, { fields });
										}}
										className={cn(
											'text-[10px] px-1.5 py-0.5 rounded border transition-colors',
											pt.fields.includes(f.name)
												? 'bg-indigo-100 text-indigo-700 border-indigo-300'
												: 'bg-background text-muted-foreground border-muted hover:bg-muted',
										)}
									>
										{f.name}
									</button>
								))}
							</div>
						));
					})()}
				</div>
				<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemove(voId, ptIdx)}>
					<Trash2 className="w-3.5 h-3.5 text-red-500" />
				</Button>
			</div>
			{!isPrimary && (
				<div className="ml-5 space-y-2 border-l pl-3">
					<div className="flex items-center justify-between">
						<span className="text-[10px] font-semibold uppercase text-muted-foreground">Join to primary</span>
						<Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={() => onAddJoinCondition(voId, ptIdx)}>
							<Plus className="w-2.5 h-2.5 mr-1" /> Condition
						</Button>
					</div>
					{(pt.joinConditions ?? []).map((jc, jcIdx) => (
						<div key={jcIdx} className="flex items-center gap-2">
							<Select value={jc.sourceField} onValueChange={v => onUpdateJoinCondition(voId, ptIdx, jcIdx, { sourceField: v })}>
								<SelectTrigger className="flex-1 h-7 text-xs"><SelectValue placeholder="primary field" /></SelectTrigger>
								<SelectContent>
									{primaryFields.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
								</SelectContent>
							</Select>
							<span className="text-xs text-muted-foreground">=</span>
							<Select value={jc.targetField} onValueChange={v => onUpdateJoinCondition(voId, ptIdx, jcIdx, { targetField: v })}>
								<SelectTrigger className="flex-1 h-7 text-xs"><SelectValue placeholder="current field" /></SelectTrigger>
								<SelectContent>
									{pt.fields.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
								</SelectContent>
							</Select>
							<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemoveJoinCondition(voId, ptIdx, jcIdx)}>
								<Trash2 className="w-3 h-3 text-red-500" />
							</Button>
						</div>
					))}
					{(pt.joinConditions ?? []).length === 0 && (
						<div className="text-[10px] text-muted-foreground">Add a condition, e.g. primary.agent_code = current.agent_code.</div>
					)}
				</div>
			)}
			{/* Filters: row-level key-in constants, e.g. policy_status_code eq "issued" */}
			<div className="ml-5 space-y-2 border-l pl-3">
				<div className="flex items-center justify-between">
					<span className="text-[10px] font-semibold uppercase text-muted-foreground">Filters (key-in constants)</span>
					<Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={() => onAddFilter(voId, ptIdx)}>
						<Plus className="w-2.5 h-2.5 mr-1" /> Filter
					</Button>
				</div>
				{(pt.filters ?? []).map((flt, fltIdx) => (
					<FilterRowEditor
						key={fltIdx}
						flt={flt}
						onPatch={p => onUpdateFilter(voId, ptIdx, fltIdx, p)}
						onRemove={() => onRemoveFilter(voId, ptIdx, fltIdx)}
					>
						<Select value={flt.field} onValueChange={v => onUpdateFilter(voId, ptIdx, fltIdx, { field: v })}>
							<SelectTrigger className="flex-1 min-w-[120px] h-7 text-xs"><SelectValue placeholder="field" /></SelectTrigger>
							<SelectContent>
								{tableFields.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
							</SelectContent>
						</Select>
					</FilterRowEditor>
				))}
				{(pt.filters ?? []).length === 0 && (
					<div className="text-[10px] text-muted-foreground">Optional: restrict rows, e.g. policy_status_code in "issued,active".</div>
				)}
			</div>
		</div>
	);
};

export const PhysicalTableEditor = React.memo(PhysicalTableEditorImpl);
