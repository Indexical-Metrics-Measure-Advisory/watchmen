import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VirtualObject } from '@/model/ontology';

interface Props {
	vo: VirtualObject;
	onAdd: (voId: string) => void;
	onUpdate: (voId: string, idx: number, patch: Partial<{ name: string; sourceTable: string; sourceField: string }>) => void;
	onRemove: (voId: string, idx: number) => void;
}

export const AttributesEditor = React.memo<Props>(({ vo, onAdd, onUpdate, onRemove }) => (
	<div className="space-y-2">
		<div className="flex items-center justify-between">
			<span className="text-xs font-semibold uppercase text-muted-foreground">Attributes</span>
			<Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onAdd(vo.id)}>
				<Plus className="w-3 h-3 mr-1" /> Add
			</Button>
		</div>
		{vo.attributes.map((attr, attrIdx) => (
			<div key={attrIdx} className="flex items-center gap-2">
				<Input
					value={attr.name}
					onChange={e => onUpdate(vo.id, attrIdx, { name: e.target.value })}
					placeholder="attr name"
					className="flex-1 h-7 text-xs"
				/>
				<span className="text-xs text-muted-foreground">←</span>
				<Select
					value={attr.sourceTable}
					onValueChange={v => onUpdate(vo.id, attrIdx, { sourceTable: v })}
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
					onValueChange={v => onUpdate(vo.id, attrIdx, { sourceField: v })}
				>
					<SelectTrigger className="w-32 h-7 text-xs"><SelectValue placeholder="field" /></SelectTrigger>
					<SelectContent>
						{vo.physicalTables.find(pt => (pt.alias || pt.topicName) === attr.sourceTable)?.fields.map(f => (
							<SelectItem key={f} value={f}>{f}</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemove(vo.id, attrIdx)}>
					<Trash2 className="w-3.5 h-3.5 text-red-500" />
				</Button>
			</div>
		))}
	</div>
));
