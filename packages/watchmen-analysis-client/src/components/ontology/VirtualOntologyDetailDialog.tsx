import React, { useEffect, useState } from 'react';
import {
	Boxes, Link2, Table2, Sigma, ArrowRight, Pencil,
	Database, ChevronDown, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { cn } from '@/lib/utils';
import {
	VirtualOntology,
	VirtualObject,
	VirtualLink,
	DerivedAttribute,
	sensitivityConfig,
	physicalTableKindConfig,
	physicalTableJoinTypeConfig,
	joinTypeConfig,
	aggregateConfig,
	filterOperatorConfig,
} from '@/model/ontology';
import { resolvePhysicalTableLabel } from '@/services/ontologyService';
import { getAllDataSources, DataSource } from '@/services/dataSourceService';

interface Props {
	ontology: VirtualOntology | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onEdit: (ontology: VirtualOntology) => void;
}

export const VirtualOntologyDetailDialog: React.FC<Props> = ({ ontology, open, onOpenChange, onEdit }) => {
	const [expandedObjects, setExpandedObjects] = useState<Set<string>>(new Set());
	const [dataSources, setDataSources] = useState<DataSource[]>([]);

	useEffect(() => {
		if (open) {
			getAllDataSources().then(setDataSources).catch(() => setDataSources([]));
		}
	}, [open]);

	const datasourceName = (id?: string) => {
		if (!id) return null;
		const ds = dataSources.find(d => d.dataSourceId === id);
		return ds?.name ?? id;
	};

	if (!ontology) return null;

	const toggleObject = (id: string) => {
		setExpandedObjects(prev => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const findObject = (id: string) => ontology.virtualObjects.find(vo => vo.id === id);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl max-h-[90vh] !flex !flex-col overflow-hidden">
				<DialogHeader className="shrink-0">
					<div className="flex items-start justify-between gap-3">
						<div>
							<DialogTitle className="text-xl">{ontology.name}</DialogTitle>
							<p className="text-sm text-muted-foreground mt-1">{ontology.description}</p>
						</div>
						<Badge className={`${(sensitivityConfig[ontology.sensitivity] ?? sensitivityConfig.internal).className} border-0`}>
							{(sensitivityConfig[ontology.sensitivity] ?? sensitivityConfig.internal).icon} {(sensitivityConfig[ontology.sensitivity] ?? sensitivityConfig.internal).label}
						</Badge>
					</div>
				</DialogHeader>

				<div className="flex-1 min-h-0 overflow-y-auto pr-2">
					<div className="space-y-5">
						{/* Meta */}
						<div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg border">
							<div>
								<div className="text-xs text-muted-foreground uppercase font-medium mb-1">Business Owner</div>
								<div className="text-sm font-medium">{ontology.owner || '-'}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground uppercase font-medium mb-1">Tech Owner</div>
								<div className="text-sm font-medium">{ontology.technicalOwner || '-'}</div>
							</div>
						</div>

						{/* Tags */}
						{ontology.tags.length > 0 && (
							<div className="flex flex-wrap gap-2">
								{ontology.tags.map(tag => (
									<Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
								))}
							</div>
						)}

						{/* Three-layer architecture */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
							<LayerCard
								icon={<Boxes className="w-5 h-5 text-primary" />}
								bg="bg-primary/10"
								label="Business Layer"
								value={ontology.virtualObjects.length}
								sub="Virtual Objects"
							/>
							<LayerCard
								icon={<Link2 className="w-5 h-5 text-emerald-600" />}
								bg="bg-emerald-50"
								label="Mapping Layer"
								value={ontology.virtualLinks.length}
								sub="Virtual Links"
							/>
							<LayerCard
								icon={<Table2 className="w-5 h-5 text-purple-600" />}
								bg="bg-purple-50"
								label="Physical Layer"
								value={ontology.virtualObjects.reduce((s, vo) => s + vo.physicalTables.length, 0)}
								sub="Tables"
							/>
						</div>

						{/* Virtual Objects */}
						<div className="space-y-3">
							<h3 className="text-sm font-semibold flex items-center gap-2">
								<Boxes className="w-4 h-4 text-primary" />
								Virtual Objects ({ontology.virtualObjects.length})
							</h3>
							{ontology.virtualObjects.map(vo => {
								const expanded = expandedObjects.has(vo.id);
								return (
									<Card key={vo.id} className="border">
										<CardHeader className="pb-2 cursor-pointer" onClick={() => toggleObject(vo.id)}>
											<div className="flex items-center gap-2">
												{expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
												<span className="text-lg">{vo.icon || '📦'}</span>
												<CardTitle className="text-base flex-1">{vo.name}</CardTitle>
												{datasourceName(vo.datasourceId) && (
													<Badge variant="secondary" className="text-[10px]" title={`Data source: ${datasourceName(vo.datasourceId)}`}>
														<Database className="w-3 h-3 mr-1" />
														{datasourceName(vo.datasourceId)}
													</Badge>
												)}
												<Badge variant="outline" className="text-[10px]">
													{vo.physicalTables.length} tables
												</Badge>
												{vo.derivedAttributes.length > 0 && (
													<Badge variant="outline" className="text-[10px]">
														<Sigma className="w-3 h-3 mr-1" />
														{vo.derivedAttributes.length}
													</Badge>
												)}
											</div>
											{!expanded && (
												<p className="text-xs text-muted-foreground ml-6 line-clamp-1">{vo.description}</p>
											)}
										</CardHeader>
										{expanded && (
											<CardContent className="space-y-4 pt-2">
												<p className="text-sm text-muted-foreground">{vo.description}</p>

												{/* Physical tables */}
												<div className="space-y-2">
													<div className="text-xs font-semibold uppercase text-muted-foreground">Physical Tables</div>
													{vo.physicalTables.map((pt, idx) => {
													const kindCfg = physicalTableKindConfig[pt.kind] ?? physicalTableKindConfig.detail;
													const joinCfg = pt.kind === 'primary' ? null : physicalTableJoinTypeConfig[pt.joinType ?? kindCfg.defaultJoinType];
													return (
														<div key={idx} className="flex items-center gap-2 p-2 rounded-md bg-muted/20 text-sm">
															<Database className="w-3.5 h-3.5 text-muted-foreground" />
															<span className="font-medium">{resolvePhysicalTableLabel(pt)}</span>
															<Badge variant="outline" className={cn('text-[10px]', kindCfg.className)}>
																{kindCfg.icon} {kindCfg.label}
															</Badge>
															{joinCfg && (
																<Badge variant="outline" className={cn('text-[10px]', joinCfg.className)}>
																	{joinCfg.label}
																</Badge>
															)}
																{pt.fields.length > 0 && (
																	<div className="flex flex-wrap gap-1 ml-2">
																		{pt.fields.slice(0, 5).map(f => (
																			<Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>
																		))}
																		{pt.fields.length > 5 && (
																			<span className="text-[10px] text-muted-foreground">+{pt.fields.length - 5}</span>
																		)}
																	</div>
																)}
																{(pt.filters ?? []).length > 0 && (
																	<div className="flex flex-wrap gap-1 ml-2 items-center">
																		<span className="text-[10px] text-muted-foreground uppercase">filter:</span>
																		{(pt.filters ?? []).map((flt, fIdx) => {
																			const opCfg = filterOperatorConfig[flt.operator] ?? filterOperatorConfig.eq;
																			const valStr = Array.isArray(flt.value)
																				? `[${flt.value.join(', ')}]`
																				: (flt.value === undefined || flt.value === null || flt.value === '')
																					? ''
																					: String(flt.value);
																			const text = opCfg.needsValue === 'none'
																				? `${flt.field} ${opCfg.label}`
																				: `${flt.field} ${opCfg.label} ${valStr}`;
																			return (
																				<Badge key={fIdx} variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200">
																					{text}
																				</Badge>
																			);
																		})}
																	</div>
																)}
															</div>
														);
													})}
												</div>

												{/* Attributes */}
												{vo.attributes.length > 0 && (
													<div className="space-y-2">
														<div className="text-xs font-semibold uppercase text-muted-foreground">Business Attributes</div>
														<div className="flex flex-wrap gap-2">
															{vo.attributes.map((attr, idx) => (
																<Badge key={idx} variant="outline" className="text-xs">
																	{attr.name}
																	<span className="text-muted-foreground ml-1">← {attr.sourceTable}.{attr.sourceField}</span>
																</Badge>
															))}
														</div>
													</div>
												)}

												{/* Derived attributes */}
												{vo.derivedAttributes.length > 0 && (
													<div className="space-y-2">
														<div className="text-xs font-semibold uppercase text-muted-foreground">Derived Attributes</div>
														{vo.derivedAttributes.map(da => (
															<DerivedAttributeRow key={da.id} attr={da} findObject={findObject} links={ontology.virtualLinks} />
														))}
													</div>
												)}
											</CardContent>
										)}
									</Card>
								);
							})}
						</div>

						{/* Virtual Links */}
						{ontology.virtualLinks.length > 0 && (
							<div className="space-y-3">
								<h3 className="text-sm font-semibold flex items-center gap-2">
									<Link2 className="w-4 h-4 text-emerald-500" />
									Virtual Links ({ontology.virtualLinks.length})
								</h3>
								{ontology.virtualLinks.map(link => {
								const source = findObject(link.sourceObjectId);
								const target = findObject(link.targetObjectId);
								const joinCfg = joinTypeConfig[link.joinType] ?? joinTypeConfig.inner;
								return (
									<Card key={link.id} className="border">
										<CardContent className="p-3 space-y-2">
											<div className="flex items-center gap-2">
												<span className="text-base">{source?.icon || '?'}</span>
												<span className="font-medium text-sm">{source?.name || '?'}</span>
												<ArrowRight className="w-4 h-4 text-muted-foreground" />
												<span className="text-base">{target?.icon || '?'}</span>
												<span className="font-medium text-sm">{target?.name || '?'}</span>
												<Badge variant="outline" className={cn('text-[10px] ml-auto', joinCfg.className)}>
													{joinCfg.label}
												</Badge>
											</div>
											{link.description && (
												<p className="text-xs text-muted-foreground">{link.description}</p>
											)}
											<div className="flex flex-wrap gap-1.5">
												{link.joinConditions.map((jc, idx) => (
													<Badge key={idx} variant="secondary" className="text-[10px]">
														{jc.sourceField} = {jc.targetField}
													</Badge>
												))}
											</div>
										</CardContent>
									</Card>
								);
							})}
							</div>
						)}
					</div>
				</div>

				<div className="flex justify-end gap-2 pt-3 border-t shrink-0">
					<Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
					<Button onClick={() => onEdit(ontology)} className="gap-2">
						<Pencil className="w-4 h-4" />
						Edit
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};

const LayerCard: React.FC<{ icon: React.ReactNode; bg: string; label: string; value: number; sub: string }> = ({ icon, bg, label, value, sub }) => (
	<div className="p-3 rounded-lg border bg-muted/20">
		<div className="flex items-center gap-2 mb-1">
			<div className={cn('p-1.5 rounded-md', bg)}>{icon}</div>
			<span className="text-xl font-bold">{value}</span>
		</div>
		<div className="text-sm font-semibold">{label}</div>
		<div className="text-xs text-muted-foreground">{sub}</div>
	</div>
);

const DerivedAttributeRow: React.FC<{
	attr: DerivedAttribute;
	findObject: (id: string) => VirtualObject | undefined;
	links: VirtualLink[];
}> = ({ attr, findObject, links }) => {
	const aggCfg = aggregateConfig[attr.aggregate] ?? aggregateConfig.none;
	const pathLabels = (attr.path ?? []).map((id, idx) => {
		if (idx % 2 === 0) {
			const obj = findObject(id);
			return obj?.name || id;
		} else {
			const link = links.find(l => l.id === id);
			return link?.name || id;
		}
	});

	return (
		<div className="p-2 rounded-md bg-amber-50/50 border border-amber-200/50">
			<div className="flex items-center gap-2 mb-1">
				<span className="text-sm font-medium">{aggCfg.icon}</span>
				<span className="font-medium text-sm">{attr.name}</span>
				<Badge variant="outline" className="text-[10px]">{aggCfg.label}</Badge>
				{attr.targetField && (
					<span className="text-xs text-muted-foreground">on {attr.targetField}</span>
				)}
			</div>
			{attr.description && (
				<p className="text-xs text-muted-foreground mb-1">{attr.description}</p>
			)}
			<div className="flex items-center gap-1 flex-wrap text-[10px] text-muted-foreground">
				<span className="font-medium">Path:</span>
				{pathLabels.map((label, idx) => (
					<React.Fragment key={idx}>
						{idx > 0 && <ArrowRight className="w-2.5 h-2.5" />}
						<span className="bg-muted px-1.5 py-0.5 rounded">{label}</span>
					</React.Fragment>
				))}
			</div>
		</div>
	);
};
