import React, { useEffect, useState, useMemo } from 'react';
import {
	Plus, Trash2, Boxes, Link2, Table2, Sigma, Database, ChevronDown, ChevronRight, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { cn } from '@/lib/utils';
import { topicService, Topic } from '@/services/topicService';
import { getAllDataSources, DataSource } from '@/services/dataSourceService';
import {
	VirtualOntology, VirtualObject, VirtualLink, DerivedAttribute, PhysicalTableMapping,
	FilterCondition, FilterOperator, filterOperatorConfig, filterValueAsString, filterValueAsList,
	physicalTableKindConfig, physicalTableJoinTypeConfig, joinTypeConfig, aggregateConfig,
	sensitivityConfig, OntologySensitivity,
} from '@/model/ontology';
import {
	createEmptyVirtualOntology, createEmptyVirtualObject, createEmptyVirtualLink,
	createEmptyDerivedAttribute,
} from '@/services/ontologyService';

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: 'create' | 'edit';
	ontology: VirtualOntology | null;
	onSave: (ontology: VirtualOntology) => void;
}

type TabKey = 'objects' | 'links' | 'meta';

export const VirtualOntologyEditorDialog: React.FC<Props> = ({ open, onOpenChange, mode, ontology, onSave }) => {
	const [draft, setDraft] = useState<VirtualOntology>(createEmptyVirtualOntology());
	const [topics, setTopics] = useState<Topic[]>([]);
	const [dataSources, setDataSources] = useState<DataSource[]>([]);
	const [activeTab, setActiveTab] = useState<TabKey>('objects');
	const [expandedObjects, setExpandedObjects] = useState<Set<string>>(new Set());

	useEffect(() => {
		if (open) {
			setDraft(ontology ? structuredClone(ontology) : createEmptyVirtualOntology());
			setActiveTab('objects');
			setExpandedObjects(new Set());
			topicService.getDatamartTopics().then(setTopics).catch(() => setTopics([]));
			getAllDataSources().then(setDataSources).catch(() => setDataSources([]));
		}
	}, [open, ontology]);

	const topicMap = useMemo(() => {
		const map = new Map<string, Topic>();
		topics.forEach(t => map.set(t.id, t));
		return map;
	}, [topics]);

	// Factor type 把 watchmen 原始 type 归并成 UI 友好的分组标签（数字、时间、文本等）。
	const factorTypeGroup = (rawType: string): string => {
		const t = (rawType || "").toLowerCase();
		if (["number", "int", "integer", "long", "float", "double", "decimal", "numeric", "amount", "money"].includes(t)) {
			return "number";
		}
		if (["date", "datetime", "timestamp", "time", "instant"].includes(t)) {
			return "datetime";
		}
		if (["boolean", "bool"].includes(t)) {
			return "boolean";
		}
		if (["text", "string", "varchar", "char", "object", "json"].includes(t)) {
			return "text";
		}
		return t || "other";
	};

	const factorTypeBadgeClass = (group: string): string => {
		switch (group) {
			case "number": return "bg-emerald-100 text-emerald-700";
			case "datetime": return "bg-sky-100 text-sky-700";
			case "boolean": return "bg-amber-100 text-amber-700";
			case "text": return "bg-slate-100 text-slate-700";
			default: return "bg-zinc-100 text-zinc-700";
		}
	};

	const update = (patch: Partial<VirtualOntology>) => setDraft(prev => ({ ...prev, ...patch }));

	const toggleObject = (id: string) => {
		setExpandedObjects(prev => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	// ---- Virtual Object operations ----
	const addObject = () => {
		const vo = createEmptyVirtualObject(draft.virtualObjects.length);
		setDraft(prev => ({ ...prev, virtualObjects: [...prev.virtualObjects, vo] }));
		setExpandedObjects(prev => new Set(prev).add(vo.id));
	};

	const updateObject = (id: string, patch: Partial<VirtualObject>) => {
		setDraft(prev => ({
			...prev,
			virtualObjects: prev.virtualObjects.map(vo => vo.id === id ? { ...vo, ...patch } : vo),
		}));
	};

	const removeObject = (id: string) => {
		setDraft(prev => ({
			...prev,
			virtualObjects: prev.virtualObjects.filter(vo => vo.id !== id),
			virtualLinks: prev.virtualLinks.filter(l => l.sourceObjectId !== id && l.targetObjectId !== id),
		}));
	};

	// ---- Physical table operations ----
	const addPhysicalTable = (voId: string, topic: Topic) => {
		const pt: PhysicalTableMapping = {
			topicId: topic.id,
			topicName: topic.name,
			alias: '',
			kind: 'detail',
			fields: [],
			joinConditions: [],
		};
		setDraft(prev => ({
			...prev,
			virtualObjects: prev.virtualObjects.map(vo =>
				vo.id === voId ? { ...vo, physicalTables: [...vo.physicalTables, pt] } : vo
			),
		}));
	};

	const updatePhysicalTable = (voId: string, idx: number, patch: Partial<PhysicalTableMapping>) => {
		setDraft(prev => ({
			...prev,
			virtualObjects: prev.virtualObjects.map(vo => {
				if (vo.id !== voId) return vo;
				const tables = vo.physicalTables.map((pt, i) => i === idx ? { ...pt, ...patch } : pt);
				return { ...vo, physicalTables: tables };
			}),
		}));
	};

	const removePhysicalTable = (voId: string, idx: number) => {
		setDraft(prev => ({
			...prev,
			virtualObjects: prev.virtualObjects.map(vo => {
				if (vo.id !== voId) return vo;
				return { ...vo, physicalTables: vo.physicalTables.filter((_, i) => i !== idx) };
			}),
		}));
	};

	const addPhysicalTableJoinCondition = (voId: string, tableIdx: number) => {
		const vo = draft.virtualObjects.find(v => v.id === voId);
		const table = vo?.physicalTables[tableIdx];
		if (!table) return;
		updatePhysicalTable(voId, tableIdx, {
			joinConditions: [...(table.joinConditions ?? []), { sourceField: '', targetField: '' }],
		});
	};

	const updatePhysicalTableJoinCondition = (
		voId: string,
		tableIdx: number,
		conditionIdx: number,
		patch: Partial<{ sourceField: string; targetField: string }>,
	) => {
		const vo = draft.virtualObjects.find(v => v.id === voId);
		const table = vo?.physicalTables[tableIdx];
		if (!table) return;
		const joinConditions = [...(table.joinConditions ?? [])];
		joinConditions[conditionIdx] = { ...joinConditions[conditionIdx], ...patch };
		updatePhysicalTable(voId, tableIdx, { joinConditions });
	};

	const removePhysicalTableJoinCondition = (voId: string, tableIdx: number, conditionIdx: number) => {
		const vo = draft.virtualObjects.find(v => v.id === voId);
		const table = vo?.physicalTables[tableIdx];
		if (!table) return;
		updatePhysicalTable(voId, tableIdx, {
			joinConditions: (table.joinConditions ?? []).filter((_, i) => i !== conditionIdx),
		});
	};

	// ---- Physical table filters ----
	const addPhysicalTableFilter = (voId: string, tableIdx: number) => {
		const vo = draft.virtualObjects.find(v => v.id === voId);
		const table = vo?.physicalTables[tableIdx];
		if (!table) return;
		const next: FilterCondition = { field: '', operator: 'eq', value: '' };
		updatePhysicalTable(voId, tableIdx, {
			filters: [...(table.filters ?? []), next],
		});
	};

	const updatePhysicalTableFilter = (
		voId: string,
		tableIdx: number,
		filterIdx: number,
		patch: Partial<FilterCondition>,
	) => {
		const vo = draft.virtualObjects.find(v => v.id === voId);
		const table = vo?.physicalTables[tableIdx];
		if (!table) return;
		const filters = [...(table.filters ?? [])];
		const current = filters[filterIdx];
		if (!current) return;
		const merged: FilterCondition = { ...current, ...patch };

		// When operator changes, coerce value into the shape required by the new operator.
		if (patch.operator) {
			const needsValue = filterOperatorConfig[merged.operator].needsValue;
			if (needsValue === 'list') {
				const existing = filterValueAsList(current.value);
				merged.value = existing;
			} else if (needsValue === 'single') {
				merged.value = filterValueAsString(current.value);
			} else {
				merged.value = '';
			}
		}

		filters[filterIdx] = merged;
		updatePhysicalTable(voId, tableIdx, { filters });
	};

	const removePhysicalTableFilter = (voId: string, tableIdx: number, filterIdx: number) => {
		const vo = draft.virtualObjects.find(v => v.id === voId);
		const table = vo?.physicalTables[tableIdx];
		if (!table) return;
		updatePhysicalTable(voId, tableIdx, {
			filters: (table.filters ?? []).filter((_, i) => i !== filterIdx),
		});
	};

	// ---- Attribute operations ----
	const addAttribute = (voId: string) => {
		setDraft(prev => ({
			...prev,
			virtualObjects: prev.virtualObjects.map(vo =>
				vo.id === voId ? { ...vo, attributes: [...vo.attributes, { name: '', sourceTable: '', sourceField: '' }] } : vo
			),
		}));
	};

	const updateAttribute = (voId: string, idx: number, patch: Partial<{ name: string; sourceTable: string; sourceField: string }>) => {
		setDraft(prev => ({
			...prev,
			virtualObjects: prev.virtualObjects.map(vo => {
				if (vo.id !== voId) return vo;
				const attrs = vo.attributes.map((a, i) => i === idx ? { ...a, ...patch } : a);
				return { ...vo, attributes: attrs };
			}),
		}));
	};

	const removeAttribute = (voId: string, idx: number) => {
		setDraft(prev => ({
			...prev,
			virtualObjects: prev.virtualObjects.map(vo => {
				if (vo.id !== voId) return vo;
				return { ...vo, attributes: vo.attributes.filter((_, i) => i !== idx) };
			}),
		}));
	};

	// ---- Derived attribute operations ----
	const addDerived = (voId: string) => {
		const vo = draft.virtualObjects.find(v => v.id === voId);
		if (!vo) return;
		const da = createEmptyDerivedAttribute(voId);
		setDraft(prev => ({
			...prev,
			virtualObjects: prev.virtualObjects.map(v =>
				v.id === voId ? { ...v, derivedAttributes: [...v.derivedAttributes, da] } : v
			),
		}));
	};

	const updateDerived = (voId: string, daId: string, patch: Partial<DerivedAttribute>) => {
		setDraft(prev => ({
			...prev,
			virtualObjects: prev.virtualObjects.map(vo => {
				if (vo.id !== voId) return vo;
				return { ...vo, derivedAttributes: vo.derivedAttributes.map(da => da.id === daId ? { ...da, ...patch } : da) };
			}),
		}));
	};

	const removeDerived = (voId: string, daId: string) => {
		setDraft(prev => ({
			...prev,
			virtualObjects: prev.virtualObjects.map(vo => {
				if (vo.id !== voId) return vo;
				return { ...vo, derivedAttributes: vo.derivedAttributes.filter(da => da.id !== daId) };
			}),
		}));
	};

	// ---- Link operations ----
	const addLink = () => {
		setDraft(prev => ({ ...prev, virtualLinks: [...prev.virtualLinks, createEmptyVirtualLink()] }));
	};

	const updateLink = (idx: number, patch: Partial<VirtualLink>) => {
		setDraft(prev => ({
			...prev,
			virtualLinks: prev.virtualLinks.map((l, i) => i === idx ? { ...l, ...patch } : l),
		}));
	};

	const removeLink = (idx: number) => {
		setDraft(prev => ({ ...prev, virtualLinks: prev.virtualLinks.filter((_, i) => i !== idx) }));
	};

	// ---- Link filter operations ----
	const addLinkFilter = (idx: number) => {
		setDraft(prev => ({
			...prev,
			virtualLinks: prev.virtualLinks.map((l, i) =>
				i === idx
					? { ...l, filters: [...(l.filters ?? []), { field: '', operator: 'eq' as FilterOperator, value: '' }] }
					: l
			),
		}));
	};

	const updateLinkFilter = (idx: number, fIdx: number, patch: Partial<FilterCondition>) => {
		setDraft(prev => ({
			...prev,
			virtualLinks: prev.virtualLinks.map((l, i) => {
				if (i !== idx) return l;
				const filters = [...(l.filters ?? [])];
				filters[fIdx] = { ...filters[fIdx], ...patch };
				return { ...l, filters };
			}),
		}));
	};

	const removeLinkFilter = (idx: number, fIdx: number) => {
		setDraft(prev => ({
			...prev,
			virtualLinks: prev.virtualLinks.map((l, i) => {
				if (i !== idx) return l;
				return { ...l, filters: (l.filters ?? []).filter((_, fi) => fi !== fIdx) };
			}),
		}));
	};

	/** 解析 link filter 的 field（"source.col" / "target.col" / "col"）。 */
	const parseLinkFilterField = (raw: string): { side: 'source' | 'target' | 'none'; column: string } => {
		const trimmed = (raw || '').trim();
		const lower = trimmed.toLowerCase();
		if (lower.startsWith('source.')) return { side: 'source', column: trimmed.slice('source.'.length) };
		if (lower.startsWith('target.')) return { side: 'target', column: trimmed.slice('target.'.length) };
		return { side: 'none', column: trimmed };
	};

	/** 设置 link filter 的 side (source/target)，保留 column 部分。 */
	const setLinkFilterSide = (idx: number, fIdx: number, side: 'source' | 'target' | 'none') => {
		const current = (draft.virtualLinks[idx]?.filters ?? [])[fIdx];
		if (!current) return;
		const parsed = parseLinkFilterField(current.field);
		let nextField: string;
		if (side === 'none') nextField = parsed.column;
		else nextField = `${side}.${parsed.column}`;
		updateLinkFilter(idx, fIdx, { field: nextField });
	};

	/** 拿到 link source / target 物理表所有可用的列名（来自 primary table 的 fields）。 */
	const getLinkSideFields = (link: VirtualLink, side: 'source' | 'target'): string[] => {
		const objectId = side === 'source' ? link.sourceObjectId : link.targetObjectId;
		const vo = draft.virtualObjects.find(o => o.id === objectId);
		if (!vo) return [];
		const primary = vo.physicalTables.find(t => t.kind === 'primary');
		return primary?.fields ?? [];
	};

	const handleSave = () => {
		const saved = { ...draft, updatedAt: new Date().toISOString().slice(0, 10) };
		onSave(saved);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-5xl max-h-[90vh] !flex !flex-col overflow-hidden">
				<DialogHeader className="shrink-0">
					<DialogTitle>{mode === 'create' ? 'Create Virtual Ontology' : `Edit: ${draft.name}`}</DialogTitle>
				</DialogHeader>

				{/* Tabs */}
				<div className="flex gap-1 border-b pb-2 shrink-0">
					<TabButton active={activeTab === 'objects'} onClick={() => setActiveTab('objects')} icon={<Boxes className="w-4 h-4" />} label="Virtual Objects" />
					<TabButton active={activeTab === 'links'} onClick={() => setActiveTab('links')} icon={<Link2 className="w-4 h-4" />} label="Virtual Links" />
					<TabButton active={activeTab === 'meta'} onClick={() => setActiveTab('meta')} icon={<Database className="w-4 h-4" />} label="Meta" />
				</div>

				<div className="flex-1 min-h-0 overflow-y-auto pr-2">
					{activeTab === 'meta' && (
						<div className="space-y-4 p-1">
							<Field label="Ontology Name">
								<Input value={draft.name} onChange={e => update({ name: e.target.value })} placeholder="e.g. Customer Virtual Ontology" />
							</Field>
							<Field label="Description">
								<Input value={draft.description} onChange={e => update({ description: e.target.value })} placeholder="Brief description" />
							</Field>
							<div className="grid grid-cols-2 gap-3">
								<Field label="Business Owner">
									<Input value={draft.owner} onChange={e => update({ owner: e.target.value })} />
								</Field>
								<Field label="Technical Owner">
									<Input value={draft.technicalOwner} onChange={e => update({ technicalOwner: e.target.value })} />
								</Field>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<Field label="Sensitivity">
									<Select value={draft.sensitivity} onValueChange={v => update({ sensitivity: v as OntologySensitivity })}>
										<SelectTrigger><SelectValue /></SelectTrigger>
										<SelectContent>
											{Object.entries(sensitivityConfig).map(([key, cfg]) => (
												<SelectItem key={key} value={key}>{cfg.icon} {cfg.label}</SelectItem>
											))}
										</SelectContent>
									</Select>
								</Field>
								<Field label="Tags (comma separated)">
									<Input
										value={draft.tags.join(', ')}
										onChange={e => update({ tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
									/>
								</Field>
							</div>
						</div>
					)}

					{activeTab === 'objects' && (
						<div className="space-y-4 p-1">
							{draft.virtualObjects.map((vo, voIdx) => {
								const expanded = expandedObjects.has(vo.id);
								return (
									<Card key={vo.id} className="border">
										<CardHeader className="pb-2">
											<div className="flex items-center gap-2">
												<button onClick={() => toggleObject(vo.id)} className="p-1 hover:bg-muted rounded">
													{expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
												</button>
												<Input
													value={vo.icon || ''}
													onChange={e => updateObject(vo.id, { icon: e.target.value })}
													className="w-12 text-center"
													placeholder="📦"
												/>
												<Input
													value={vo.name}
													onChange={e => updateObject(vo.id, { name: e.target.value })}
													className="flex-1"
													placeholder="Virtual object name"
												/>
												<Badge variant="outline" className="text-[10px]">{vo.physicalTables.length} tables</Badge>
												<Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeObject(vo.id)}>
													<Trash2 className="w-4 h-4 text-red-500" />
												</Button>
											</div>
										</CardHeader>
										{expanded && (
											<CardContent className="space-y-4 pt-2">
												<Input
													value={vo.description}
													onChange={e => updateObject(vo.id, { description: e.target.value })}
													placeholder="Description"
													className="text-sm"
												/>

												{/* Data source binding */}
												<div className="space-y-1">
													<label className="text-xs font-medium text-muted-foreground">Data Source</label>
													<Select
														value={vo.datasourceId ?? '__none__'}
														onValueChange={v => updateObject(vo.id, { datasourceId: v === '__none__' ? undefined : v })}
													>
														<SelectTrigger className="h-7 text-xs">
															<SelectValue placeholder="Select a data source" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="__none__">(no data source)</SelectItem>
															{dataSources.map(ds => (
																<SelectItem key={ds.dataSourceId} value={ds.dataSourceId}>
																	{ds.name}
																	{ds.type && <span className="text-muted-foreground"> · {ds.type}</span>}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>

												{/* Physical tables */}
												<div className="space-y-2">
													<div className="flex items-center justify-between">
														<span className="text-xs font-semibold uppercase text-muted-foreground">Physical Tables</span>
														<Select onValueChange={(topicId) => {
															const topic = topicMap.get(topicId);
															if (topic) addPhysicalTable(vo.id, topic);
														}}>
															<SelectTrigger className="w-auto h-7 text-xs">
																<Plus className="w-3 h-3 mr-1" />
																Add table
															</SelectTrigger>
															<SelectContent>
																{topics.map(t => (
																	<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
																))}
															</SelectContent>
														</Select>
													</div>
													{vo.physicalTables.map((pt, ptIdx) => {
												const isPrimary = pt.kind === 'primary';
												const primaryTable = vo.physicalTables.find(table => table.kind === 'primary');
												const primaryFields = primaryTable?.fields ?? [];
												return (
													<div key={ptIdx} className="space-y-2 p-2 rounded-md bg-muted/20">
														<div className="flex items-center gap-2">
															<Database className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
															<span className="text-sm font-medium min-w-[120px] truncate" title={pt.topicName}>{pt.topicName}</span>
															<Input
																value={pt.alias || ''}
																onChange={e => updatePhysicalTable(vo.id, ptIdx, { alias: e.target.value })}
																placeholder="alias"
																className="w-20 h-7 text-xs"
															/>
															<Select value={pt.kind} onValueChange={v => updatePhysicalTable(vo.id, ptIdx, { kind: v as PhysicalTableMapping['kind'] })}>
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
																	onValueChange={v => updatePhysicalTable(vo.id, ptIdx, { joinType: v as PhysicalTableMapping['joinType'] })}
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
																						updatePhysicalTable(vo.id, ptIdx, { fields });
																					}}
																					className={cn(
																						'text-[10px] px-1.5 py-0.5 rounded border transition-colors',
																						pt.fields.includes(f.name)
																							? 'bg-indigo-100 text-indigo-700 border-indigo-300'
																							: 'bg-background text-muted-foreground border-muted hover:bg-muted'
																					)}
																				>
																					{f.name}
																				</button>
																			))}
																		</div>
																	));
																})()}
															</div>
															<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removePhysicalTable(vo.id, ptIdx)}>
																<Trash2 className="w-3.5 h-3.5 text-red-500" />
															</Button>
														</div>
														{!isPrimary && (
															<div className="ml-5 space-y-2 border-l pl-3">
																<div className="flex items-center justify-between">
																	<span className="text-[10px] font-semibold uppercase text-muted-foreground">Join to primary</span>
																	<Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={() => addPhysicalTableJoinCondition(vo.id, ptIdx)}>
																		<Plus className="w-2.5 h-2.5 mr-1" /> Condition
																	</Button>
																</div>
																{(pt.joinConditions ?? []).map((jc, jcIdx) => (
																	<div key={jcIdx} className="flex items-center gap-2">
																		<Select value={jc.sourceField} onValueChange={v => updatePhysicalTableJoinCondition(vo.id, ptIdx, jcIdx, { sourceField: v })}>
																			<SelectTrigger className="flex-1 h-7 text-xs"><SelectValue placeholder="primary field" /></SelectTrigger>
																			<SelectContent>
																				{primaryFields.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
																			</SelectContent>
																		</Select>
																		<span className="text-xs text-muted-foreground">=</span>
																		<Select value={jc.targetField} onValueChange={v => updatePhysicalTableJoinCondition(vo.id, ptIdx, jcIdx, { targetField: v })}>
																			<SelectTrigger className="flex-1 h-7 text-xs"><SelectValue placeholder="current field" /></SelectTrigger>
																			<SelectContent>
																				{pt.fields.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
																			</SelectContent>
																		</Select>
																		<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removePhysicalTableJoinCondition(vo.id, ptIdx, jcIdx)}>
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
																<Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={() => addPhysicalTableFilter(vo.id, ptIdx)}>
																	<Plus className="w-2.5 h-2.5 mr-1" /> Filter
																</Button>
															</div>
															{(pt.filters ?? []).map((flt, fltIdx) => {
																const opCfg = filterOperatorConfig[flt.operator] ?? filterOperatorConfig.eq;
																const needsValue = opCfg.needsValue;
																const tableFields = pt.fields.length > 0 ? pt.fields : (topicMap.get(pt.topicId)?.factors?.map(f => f.name) ?? []);
																return (
																	<div key={fltIdx} className="flex items-center gap-2 flex-wrap">
																		<Select value={flt.field} onValueChange={v => updatePhysicalTableFilter(vo.id, ptIdx, fltIdx, { field: v })}>
																			<SelectTrigger className="flex-1 min-w-[120px] h-7 text-xs"><SelectValue placeholder="field" /></SelectTrigger>
																			<SelectContent>
																				{tableFields.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
																			</SelectContent>
																		</Select>
																		<Select value={flt.operator} onValueChange={v => updatePhysicalTableFilter(vo.id, ptIdx, fltIdx, { operator: v as FilterOperator })}>
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
																				onChange={e => updatePhysicalTableFilter(vo.id, ptIdx, fltIdx, { value: e.target.value })}
																				placeholder="constant"
																				className="flex-1 min-w-[120px] h-7 text-xs"
																			/>
																		)}
																		{needsValue === 'list' && (
																			<Input
																				value={filterValueAsList(flt.value).join(',')}
																				onChange={e => updatePhysicalTableFilter(vo.id, ptIdx, fltIdx, {
																					value: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
																				})}
																				placeholder="v1,v2,v3"
																				className="flex-1 min-w-[160px] h-7 text-xs"
																			/>
																		)}
																		{needsValue === 'none' && (
																			<span className="text-[10px] text-muted-foreground italic">no value</span>
																		)}
																		<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removePhysicalTableFilter(vo.id, ptIdx, fltIdx)}>
																			<Trash2 className="w-3 h-3 text-red-500" />
																		</Button>
																	</div>
																);
															})}
															{(pt.filters ?? []).length === 0 && (
																<div className="text-[10px] text-muted-foreground">Optional: restrict rows, e.g. policy_status_code in "issued,active".</div>
															)}
														</div>
													</div>
												);
											})}
												</div>

												{/* Attributes */}
												<div className="space-y-2">
													<div className="flex items-center justify-between">
														<span className="text-xs font-semibold uppercase text-muted-foreground">Attributes</span>
														<Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => addAttribute(vo.id)}>
															<Plus className="w-3 h-3 mr-1" /> Add
														</Button>
													</div>
													{vo.attributes.map((attr, attrIdx) => (
														<div key={attrIdx} className="flex items-center gap-2">
															<Input
																value={attr.name}
																onChange={e => updateAttribute(vo.id, attrIdx, { name: e.target.value })}
																placeholder="attr name"
																className="flex-1 h-7 text-xs"
															/>
															<span className="text-xs text-muted-foreground">←</span>
															<Select
																value={attr.sourceTable}
																onValueChange={v => updateAttribute(vo.id, attrIdx, { sourceTable: v })}
															>
																<SelectTrigger className="w-28 h-7 text-xs"><SelectValue placeholder="table" /></SelectTrigger>
																<SelectContent>
																	{vo.physicalTables.map(pt => (
																		<SelectItem key={pt.topicId} value={pt.alias || pt.topicName}>
																			{pt.alias || pt.topicName}
																		</SelectItem>
																	))}
																</SelectContent>
															</Select>
															<Select
																value={attr.sourceField}
																onValueChange={v => updateAttribute(vo.id, attrIdx, { sourceField: v })}
															>
																<SelectTrigger className="w-32 h-7 text-xs"><SelectValue placeholder="field" /></SelectTrigger>
																<SelectContent>
																	{vo.physicalTables.find(pt => (pt.alias || pt.topicName) === attr.sourceTable)?.fields.map(f => (
																		<SelectItem key={f} value={f}>{f}</SelectItem>
																	))}
																</SelectContent>
															</Select>
															<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeAttribute(vo.id, attrIdx)}>
																<Trash2 className="w-3 h-3 text-red-500" />
															</Button>
														</div>
													))}
												</div>

												{/* Derived attributes */}
												<div className="space-y-2">
													<div className="flex items-center justify-between">
														<span className="text-xs font-semibold uppercase text-muted-foreground">Derived Attributes</span>
														<Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => addDerived(vo.id)}>
															<Plus className="w-3 h-3 mr-1" /> Add
														</Button>
													</div>
													{vo.derivedAttributes.map(da => (
														<div key={da.id} className="p-2 rounded-md bg-amber-50/50 border border-amber-200/50 space-y-2">
															<div className="flex items-center gap-2">
																<Input
																	value={da.name}
																	onChange={e => updateDerived(vo.id, da.id, { name: e.target.value })}
																	placeholder="derived name"
																	className="flex-1 h-7 text-xs"
																/>
																<Select value={da.aggregate} onValueChange={v => updateDerived(vo.id, da.id, { aggregate: v as DerivedAttribute['aggregate'] })}>
																	<SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
																	<SelectContent>
																		{Object.entries(aggregateConfig).map(([key, cfg]) => (
																			<SelectItem key={key} value={key}>{cfg.icon} {cfg.label}</SelectItem>
																		))}
																	</SelectContent>
																</Select>
																<Input
																	value={da.targetField || ''}
																	onChange={e => updateDerived(vo.id, da.id, { targetField: e.target.value })}
																	placeholder="target field"
																	className="w-28 h-7 text-xs"
																/>
																<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeDerived(vo.id, da.id)}>
																	<Trash2 className="w-3 h-3 text-red-500" />
																</Button>
															</div>
															<Input
																value={da.description || ''}
																onChange={e => updateDerived(vo.id, da.id, { description: e.target.value })}
																placeholder="description"
																className="h-7 text-xs"
															/>
															<div className="flex items-center gap-1 flex-wrap text-[10px]">
																<span className="text-muted-foreground font-medium">Path:</span>
																{da.path.map((id, idx) => (
																	<React.Fragment key={idx}>
																		{idx > 0 && <span className="text-muted-foreground">→</span>}
																		{idx % 2 === 0 ? (
																			<Select
																				value={id}
																				onValueChange={v => {
																					const newPath = [...da.path];
																					newPath[idx] = v;
																					updateDerived(vo.id, da.id, { path: newPath });
																				}}
																			>
																				<SelectTrigger className="w-24 h-6 text-[10px]"><SelectValue /></SelectTrigger>
																				<SelectContent>
																					{draft.virtualObjects.map(o => (
																						<SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
																					))}
																				</SelectContent>
																			</Select>
																		) : (
																			<Select
																				value={id}
																				onValueChange={v => {
																					const newPath = [...da.path];
																					newPath[idx] = v;
																					updateDerived(vo.id, da.id, { path: newPath });
																				}}
																			>
																				<SelectTrigger className="w-28 h-6 text-[10px]"><SelectValue /></SelectTrigger>
																				<SelectContent>
																					{draft.virtualLinks.map(l => (
																						<SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
																					))}
																				</SelectContent>
																			</Select>
																		)}
																	</React.Fragment>
																))}
																<Button
																	variant="ghost"
																	size="sm"
																	className="h-6 text-[10px] px-1"
																	onClick={() => updateDerived(vo.id, da.id, { path: [...da.path, '', ''] })}
																>
																	<Plus className="w-2.5 h-2.5" /> hop
																</Button>
																{da.path.length > 1 && (
																	<Button
																		variant="ghost"
																		size="sm"
																		className="h-6 text-[10px] px-1"
																		onClick={() => updateDerived(vo.id, da.id, { path: da.path.slice(0, -2) })}
																	>
																		<Trash2 className="w-2.5 h-2.5" /> hop
																	</Button>
																)}
															</div>
														</div>
													))}
												</div>
											</CardContent>
										)}
									</Card>
								);
							})}
							<Button variant="outline" className="w-full gap-2" onClick={addObject}>
								<Plus className="w-4 h-4" />
								Add Virtual Object
							</Button>
						</div>
					)}

					{activeTab === 'links' && (
						<div className="space-y-4 p-1">
							{draft.virtualLinks.map((link, idx) => (
								<Card key={idx} className="border">
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
														{draft.virtualObjects.map(o => (
															<SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
														))}
													</SelectContent>
												</Select>
											</Field>
											<Field label="Target Object">
												<Select value={link.targetObjectId} onValueChange={v => updateLink(idx, { targetObjectId: v })}>
													<SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
													<SelectContent>
														{draft.virtualObjects.map(o => (
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
											<div className="text-xs font-semibold uppercase text-muted-foreground">Join Conditions</div>
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
												const opCfg = filterOperatorConfig[flt.operator] ?? filterOperatorConfig.eq;
												const needsValue = opCfg.needsValue;
												const parsed = parseLinkFilterField(flt.field);
												const columnOnly = parsed.column;
												const availableFields = parsed.side === 'target'
													? getLinkSideFields(link, 'target')
													: getLinkSideFields(link, 'source');
												return (
													<div key={fIdx} className="flex items-center gap-2 flex-wrap">
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
														<Select
															value={flt.operator}
															onValueChange={v => updateLinkFilter(idx, fIdx, { operator: v as FilterOperator })}
														>
															<SelectTrigger className="w-28 h-7 text-xs">
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																{Object.entries(filterOperatorConfig).map(([key, cfg]) => (
																	<SelectItem key={key} value={key}>{cfg.label}</SelectItem>
																))}
															</SelectContent>
														</Select>
														{needsValue === 'single' && (
															<Input
																value={filterValueAsString(flt.value)}
																onChange={e => updateLinkFilter(idx, fIdx, { value: e.target.value })}
																placeholder="constant"
																className="flex-1 min-w-[120px] h-7 text-xs"
															/>
														)}
														{needsValue === 'list' && (
															<Input
																value={filterValueAsList(flt.value).join(',')}
																onChange={e => updateLinkFilter(idx, fIdx, {
																	value: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
																})}
																placeholder="v1,v2,v3"
																className="flex-1 min-w-[160px] h-7 text-xs"
															/>
														)}
														{needsValue === 'none' && (
															<span className="text-[10px] text-muted-foreground italic">no value</span>
														)}
														<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLinkFilter(idx, fIdx)}>
															<Trash2 className="w-3.5 h-3.5 text-red-500" />
														</Button>
													</div>
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
							))}
							<Button variant="outline" className="w-full gap-2" onClick={addLink}>
								<Plus className="w-4 h-4" />
								Add Virtual Link
							</Button>
						</div>
					)}
				</div>

				<div className="flex justify-end gap-2 pt-3 border-t shrink-0">
					<Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
					<Button onClick={handleSave} disabled={!draft.name.trim()}>Save</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
	<button
		onClick={onClick}
		className={cn(
			'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
			active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
		)}
	>
		{icon}
		{label}
	</button>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
	<div className="space-y-1">
		<label className="text-xs font-medium text-muted-foreground">{label}</label>
		{children}
	</div>
);
