import React, { useEffect, useMemo, useState } from 'react';
import { Boxes, Link2, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { topicService, Topic } from '@/services/topicService';
import { getAllDataSources, DataSource } from '@/services/dataSourceService';
import { VirtualOntology } from '@/model/ontology';
import { useOntologyDraft } from './VirtualOntologyEditor/useOntologyDraft';
import { TabButton } from './VirtualOntologyEditor/shared';
import { MetaTab } from './VirtualOntologyEditor/MetaTab';
import { ObjectsTab } from './VirtualOntologyEditor/ObjectsTab';
import { LinksTab } from './VirtualOntologyEditor/LinksTab';

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: 'create' | 'edit';
	ontology: VirtualOntology | null;
	onSave: (ontology: VirtualOntology) => void;
}

type TabKey = 'objects' | 'links' | 'meta';

export const VirtualOntologyEditorDialog: React.FC<Props> = ({ open, onOpenChange, mode, ontology, onSave }) => {
	const api = useOntologyDraft(open, ontology);
	const { draft, getSavePayload, actions } = api;

	const [topics, setTopics] = useState<Topic[]>([]);
	const [dataSources, setDataSources] = useState<DataSource[]>([]);
	const [activeTab, setActiveTab] = useState<TabKey>('objects');

	useEffect(() => {
		if (open) {
			setActiveTab('objects');
			topicService.getDatamartTopics().then(setTopics).catch(() => setTopics([]));
			getAllDataSources().then(setDataSources).catch(() => setDataSources([]));
		}
	}, [open]);

	const topicMap = useMemo(() => {
		const map = new Map<string, Topic>();
		topics.forEach(t => map.set(t.id, t));
		return map;
	}, [topics]);

	const handleSave = () => {
		onSave(getSavePayload());
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
					{activeTab === 'meta' && <MetaTab draft={draft} update={actions.update} />}
					{activeTab === 'objects' && (
						<ObjectsTab api={api} topics={topics} dataSources={dataSources} topicMap={topicMap} />
					)}
					{activeTab === 'links' && <LinksTab api={api} />}
				</div>

				<div className="flex justify-end gap-2 pt-3 border-t shrink-0">
					<Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
					<Button onClick={handleSave} disabled={!draft.name.trim()}>Save</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};
