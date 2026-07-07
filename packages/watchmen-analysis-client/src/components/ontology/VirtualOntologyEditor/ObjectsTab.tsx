import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Topic } from '@/services/topicService';
import { DataSource } from '@/services/dataSourceService';
import { OntologyDraftApi } from './useOntologyDraft';
import { VirtualObjectCard } from './VirtualObjectCard';

export const ObjectsTab: React.FC<{
	api: OntologyDraftApi;
	topics: Topic[];
	dataSources: DataSource[];
	topicMap: Map<string, Topic>;
}> = ({ api, topics, dataSources, topicMap }) => {
	const { draft, expandedObjects, actions } = api;
	return (
		<div className="space-y-4 p-1">
			{draft.virtualObjects.map(vo => (
				<VirtualObjectCard
					key={vo.id}
					vo={vo}
					expanded={expandedObjects.has(vo.id)}
					actions={actions}
					allObjects={draft.virtualObjects}
					allLinks={draft.virtualLinks}
					topics={topics}
					dataSources={dataSources}
					topicMap={topicMap}
				/>
			))}
			<Button variant="outline" className="w-full gap-2" onClick={actions.addObject}>
				<Plus className="w-4 h-4" />
				Add Virtual Object
			</Button>
		</div>
	);
};
