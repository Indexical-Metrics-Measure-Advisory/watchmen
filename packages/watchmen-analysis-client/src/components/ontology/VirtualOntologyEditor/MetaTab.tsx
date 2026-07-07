import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OntologySensitivity, sensitivityConfig, VirtualOntology } from '@/model/ontology';
import { Field } from './shared';

export const MetaTab: React.FC<{
	draft: VirtualOntology;
	update: (patch: Partial<VirtualOntology>) => void;
}> = ({ draft, update }) => (
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
);
