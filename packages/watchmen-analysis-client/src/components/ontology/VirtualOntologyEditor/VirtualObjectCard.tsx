import React, { useMemo } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Topic } from '@/services/topicService';
import { DataSource } from '@/services/dataSourceService';
import { PhysicalTableMapping, VirtualLink, VirtualObject } from '@/model/ontology';
import { OntologyActions } from './useOntologyDraft';
import { PhysicalTableEditor } from './PhysicalTableEditor';
import { AttributesEditor } from './AttributesEditor';
import { DerivedAttributesEditor } from './DerivedAttributesEditor';

/** Module-level constant so useMemo returns the same ref when there's no primary table. */
const EMPTY_FIELDS: string[] = [];

export const VirtualObjectCard = React.memo<{
	vo: VirtualObject;
	expanded: boolean;
	actions: OntologyActions;
	allObjects: VirtualObject[];
	allLinks: VirtualLink[];
	topics: Topic[];
	dataSources: DataSource[];
	topicMap: Map<string, Topic>;
}>(({ vo, expanded, actions, allObjects, allLinks, topics, dataSources, topicMap }) => {
	const {
		toggleObject, removeObject, updateObject,
		addPhysicalTable, updatePhysicalTable, removePhysicalTable,
		addPhysicalTableJoinCondition, updatePhysicalTableJoinCondition, removePhysicalTableJoinCondition,
		addPhysicalTableFilter, updatePhysicalTableFilter, removePhysicalTableFilter,
		addAttribute, updateAttribute, removeAttribute,
		addDerived, updateDerived, removeDerived,
	} = actions;

	// Stable reference — only recomputes when physicalTables array changes.
	const primaryFields = useMemo(() => {
		const primaryTable = vo.physicalTables.find(t => t.kind === 'primary');
		return primaryTable?.fields ?? EMPTY_FIELDS;
	}, [vo.physicalTables]);

	return (
		<Card className="border">
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
						{vo.physicalTables.map((pt: PhysicalTableMapping, ptIdx: number) => (
							<PhysicalTableEditor
								key={ptIdx}
								voId={vo.id}
								pt={pt}
								ptIdx={ptIdx}
								primaryFields={primaryFields}
								topicMap={topicMap}
								onUpdate={updatePhysicalTable}
								onRemove={removePhysicalTable}
								onAddJoinCondition={addPhysicalTableJoinCondition}
								onUpdateJoinCondition={updatePhysicalTableJoinCondition}
								onRemoveJoinCondition={removePhysicalTableJoinCondition}
								onAddFilter={addPhysicalTableFilter}
								onUpdateFilter={updatePhysicalTableFilter}
								onRemoveFilter={removePhysicalTableFilter}
							/>
						))}
					</div>

					<AttributesEditor vo={vo} onAdd={addAttribute} onUpdate={updateAttribute} onRemove={removeAttribute} />

					<DerivedAttributesEditor
						vo={vo}
						virtualObjects={allObjects}
						virtualLinks={allLinks}
						onAdd={addDerived}
						onUpdate={updateDerived}
						onRemove={removeDerived}
					/>
				</CardContent>
			)}
		</Card>
	);
});
