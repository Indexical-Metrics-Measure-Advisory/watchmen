import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VirtualLink, VirtualObject, joinTypeConfig } from '@/model/ontology';
import { OntologyActions } from './useOntologyDraft';
import { Field } from './shared';
import { FilterRowEditor } from './FilterRowEditor';
import { getLinkSideFields, parseLinkFilterField } from './utils';

export const VirtualLinkCard = React.memo<{
	idx: number;
	link: VirtualLink;
	actions: OntologyActions;
	allObjects: VirtualObject[];
}>(({ idx, link, actions, allObjects }) => {
	const { updateLink, removeLink, addLinkFilter, updateLinkFilter, removeLinkFilter, setLinkFilterSide } = actions;

	return (
		<Card className="border">
			<CardContent className="p-3 space-y-3">
				<div className="flex items-center gap-2">
					<Input
						value={link.name}
						onChange={e => updateLink(idx, { name: e.target.value })}
						placeholder="Link name"
						className="flex-1 h-7 text-sm"
					/>
					<Select value={link.joinType} onValueChange={v => updateLink(idx, { joinType: v as VirtualLink['joinType'] })}>
						<SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
						<SelectContent>
							{Object.entries(joinTypeConfig).map(([key, cfg]) => (
								<SelectItem key={key} value={key}>{cfg.label}</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLink(idx)}>
						<Trash2 className="w-3.5 h-3.5 text-red-500" />
					</Button>
				</div>
				<div className="grid grid-cols-2 gap-3">
					<Field label="Source Object">
						<Select value={link.sourceObjectId} onValueChange={v => updateLink(idx, { sourceObjectId: v })}>
							<SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
							<SelectContent>
								{allObjects.map(o => (
									<SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>
					<Field label="Target Object">
						<Select value={link.targetObjectId} onValueChange={v => updateLink(idx, { targetObjectId: v })}>
							<SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
							<SelectContent>
								{allObjects.map(o => (
									<SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>
				</div>
				<Input
					value={link.description || ''}
					onChange={e => updateLink(idx, { description: e.target.value })}
					placeholder="Description"
					className="h-7 text-xs"
				/>
				<div className="space-y-2">
					<div className="flex items-baseline justify-between">
						<div className="text-xs font-semibold uppercase text-muted-foreground">Join Conditions</div>
						<div className="text-[10px] text-muted-foreground">
							source 用 <code className="bg-muted px-1 rounded">alias.column</code> 跨表 join；target 是 derived 终点的 primary 字段
						</div>
					</div>
					{link.joinConditions.map((jc, jcIdx) => (
						<div key={jcIdx} className="flex items-center gap-2">
							<Input
								value={jc.sourceField}
								onChange={e => {
									const conds = [...link.joinConditions];
									conds[jcIdx] = { ...conds[jcIdx], sourceField: e.target.value };
									updateLink(idx, { joinConditions: conds });
								}}
								placeholder="source field"
								className="flex-1 h-7 text-xs"
							/>
							<span className="text-xs text-muted-foreground">=</span>
							<Input
								value={jc.targetField}
								onChange={e => {
									const conds = [...link.joinConditions];
									conds[jcIdx] = { ...conds[jcIdx], targetField: e.target.value };
									updateLink(idx, { joinConditions: conds });
								}}
								placeholder="target field"
								className="flex-1 h-7 text-xs"
							/>
							<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
								const conds = link.joinConditions.filter((_, i) => i !== jcIdx);
								updateLink(idx, { joinConditions: conds });
							}}>
								<Trash2 className="w-3.5 h-3.5 text-red-500" />
							</Button>
						</div>
					))}
					<Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
						updateLink(idx, { joinConditions: [...link.joinConditions, { sourceField: '', targetField: '' }] });
					}}>
						<Plus className="w-3 h-3 mr-1" /> Add condition
					</Button>
				</div>
				{/* Filters: link-level constraints appended to the ON clause, e.g. source.role_type eq "policy_holder". */}
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<span className="text-xs font-semibold uppercase text-muted-foreground">
							Filters (link-level ON predicates)
						</span>
						<Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => addLinkFilter(idx)}>
							<Plus className="w-3 h-3 mr-1" /> Add filter
						</Button>
					</div>
					{(link.filters ?? []).map((flt, fIdx) => {
						const parsed = parseLinkFilterField(flt.field);
						const columnOnly = parsed.column;
						const availableFields = parsed.side === 'target'
							? getLinkSideFields(link, 'target', allObjects)
							: getLinkSideFields(link, 'source', allObjects);
						return (
							<FilterRowEditor
								key={fIdx}
								flt={flt}
								onPatch={p => updateLinkFilter(idx, fIdx, p)}
								onRemove={() => removeLinkFilter(idx, fIdx)}
							>
								<Select
									value={parsed.side}
									onValueChange={v => setLinkFilterSide(idx, fIdx, v as 'source' | 'target' | 'none')}
								>
									<SelectTrigger className="w-24 h-7 text-xs">
										<SelectValue placeholder="side" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="source">source</SelectItem>
										<SelectItem value="target">target</SelectItem>
										<SelectItem value="none">(none)</SelectItem>
									</SelectContent>
								</Select>
								<Select
									value={columnOnly}
									onValueChange={v => {
										const next = parsed.side === 'none' ? v : `${parsed.side}.${v}`;
										updateLinkFilter(idx, fIdx, { field: next });
									}}
									disabled={parsed.side === 'none' || availableFields.length === 0}
								>
									<SelectTrigger className="flex-1 min-w-[120px] h-7 text-xs">
										<SelectValue placeholder={availableFields.length === 0 ? 'no fields available' : 'column'} />
									</SelectTrigger>
									<SelectContent>
										{availableFields.map(f => (
											<SelectItem key={f} value={f}>{f}</SelectItem>
										))}
									</SelectContent>
								</Select>
							</FilterRowEditor>
						);
					})}
					{(link.filters ?? []).length === 0 && (
						<div className="text-[10px] text-muted-foreground">
							Optional: append a constant to the ON clause, e.g. <code className="px-1 rounded bg-muted">source.role_type = "policy_holder"</code>.
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
});
