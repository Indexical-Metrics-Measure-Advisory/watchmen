import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
	DerivedAttribute, VirtualLink, VirtualObject, aggregateConfig,
} from '@/model/ontology';

interface Props {
	vo: VirtualObject;
	virtualObjects: VirtualObject[];
	virtualLinks: VirtualLink[];
	onAdd: (voId: string) => void;
	onUpdate: (voId: string, daId: string, patch: Partial<DerivedAttribute>) => void;
	onRemove: (voId: string, daId: string) => void;
}

export const DerivedAttributesEditor = React.memo<Props>(({ vo, virtualObjects, virtualLinks, onAdd, onUpdate, onRemove }) => (
	<div className="space-y-2">
		<div className="flex items-center justify-between">
			<span className="text-xs font-semibold uppercase text-muted-foreground">Derived Attributes</span>
			<Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onAdd(vo.id)}>
				<Plus className="w-3 h-3 mr-1" /> Add
			</Button>
		</div>
		{vo.derivedAttributes.map(da => (
			<div key={da.id} className="p-2 rounded-md bg-amber-50/50 border border-amber-200/50 space-y-2">
				<div className="flex items-center gap-2">
					<Input
						value={da.name}
						onChange={e => onUpdate(vo.id, da.id, { name: e.target.value })}
						placeholder="derived name"
						className="flex-1 h-7 text-xs"
					/>
					<Select value={da.aggregate} onValueChange={v => onUpdate(vo.id, da.id, { aggregate: v as DerivedAttribute['aggregate'] })}>
						<SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
						<SelectContent>
							{Object.entries(aggregateConfig).map(([key, cfg]) => (
								<SelectItem key={key} value={key}>{cfg.icon} {cfg.label}</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Input
						value={da.targetField || ''}
						onChange={e => onUpdate(vo.id, da.id, { targetField: e.target.value })}
						placeholder="target field"
						className="w-28 h-7 text-xs"
					/>
					<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemove(vo.id, da.id)}>
						<Trash2 className="w-3.5 h-3.5 text-red-500" />
					</Button>
				</div>
				<Input
					value={da.description || ''}
					onChange={e => onUpdate(vo.id, da.id, { description: e.target.value })}
					placeholder="description"
					className="h-7 text-xs"
				/>
				<div className="flex items-center gap-1 flex-wrap text-[10px]">
				<span className="text-muted-foreground font-medium">Path:</span>
				{da.path.map((id, idx) => {
					if (idx === 0) {
						// First object is always the VO itself — read-only
						const obj = virtualObjects.find(o => o.id === id);
						return (
							<span key={idx} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
								{obj?.name || id}
							</span>
						);
					}
					if (idx % 2 === 1) {
						// Link slot: only show links connected to the previous object
						const prevObjId = da.path[idx - 1];
						const validLinks = virtualLinks.filter(
							l => l.sourceObjectId === prevObjId || l.targetObjectId === prevObjId,
						);
						return (
							<React.Fragment key={idx}>
								<span className="text-muted-foreground">→</span>
								<Select
									value={validLinks.some(l => l.id === id) ? id : ''}
									onValueChange={v => {
										const link = virtualLinks.find(l => l.id === v);
										if (!link) return;
										const nextObj = link.sourceObjectId === prevObjId
											? link.targetObjectId
											: link.sourceObjectId;
										const oldNextObj = da.path[idx + 1];
										if (oldNextObj === nextObj) {
											// Same destination — keep subsequent hops
											const newPath = [...da.path];
											newPath[idx] = v;
											onUpdate(vo.id, da.id, { path: newPath });
										} else {
											// Destination changed — truncate subsequent hops
											const newPath = [...da.path.slice(0, idx), v, nextObj];
											onUpdate(vo.id, da.id, { path: newPath });
										}
									}}
								>
									<SelectTrigger className="w-32 h-6 text-[10px]"><SelectValue placeholder="link" /></SelectTrigger>
									<SelectContent>
										{validLinks.length === 0 ? (
											<div className="px-2 py-1.5 text-[10px] text-muted-foreground">No links available</div>
										) : (
											validLinks.map(l => {
												const destId = l.sourceObjectId === prevObjId ? l.targetObjectId : l.sourceObjectId;
												const destObj = virtualObjects.find(o => o.id === destId);
												return (
													<SelectItem key={l.id} value={l.id}>
														{l.name} → {destObj?.name || '?'}
													</SelectItem>
												);
											})
										)}
									</SelectContent>
								</Select>
							</React.Fragment>
						);
					}
					// Even index > 0: object auto-determined by previous link — read-only
					const obj = virtualObjects.find(o => o.id === id);
					return (
						<React.Fragment key={idx}>
							<span className="text-muted-foreground">→</span>
							<span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
								{obj?.name || id}
							</span>
						</React.Fragment>
					);
				})}
				<Button
					variant="ghost"
					size="sm"
					className="h-6 text-[10px] px-1"
					onClick={() => onUpdate(vo.id, da.id, { path: [...da.path, '', ''] })}
				>
					<Plus className="w-2.5 h-2.5" /> hop
				</Button>
				{da.path.length > 1 && (
					<Button
						variant="ghost"
						size="sm"
						className="h-6 text-[10px] px-1"
						onClick={() => onUpdate(vo.id, da.id, { path: da.path.slice(0, -2) })}
					>
						<Trash2 className="w-2.5 h-2.5" /> hop
					</Button>
				)}
			</div>
			</div>
		))}
	</div>
));
