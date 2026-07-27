import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Topic } from '@/services/topicService';
import { DataSource } from '@/services/dataSourceService';
import { OntologyDraftApi } from './useOntologyDraft';
import { useStableArray } from './utils';
import { VirtualObjectCard } from './VirtualObjectCard';

export const ObjectsTab: React.FC<{
	api: OntologyDraftApi;
	topics: Topic[];
	dataSources: DataSource[];
	topicMap: Map<string, Topic>;
}> = ({ api, topics, dataSources, topicMap }) => {
	const { draft, expandedObjects, actions } = api;
	// key 只覆盖卡片真正消费的字段（对象 id/name、link 的 id/name/两端对象），
	// 其它编辑不会改变引用，React.memo 的卡片即可跳过无关重渲染。
	const stableObjects = useStableArray(draft.virtualObjects, vo => `${vo.id}\n${vo.name}`);
	const stableLinks = useStableArray(
		draft.virtualLinks,
		l => `${l.id}\n${l.name}\n${l.sourceObjectId}\n${l.targetObjectId}`,
	);
	return (
		<div className="space-y-4 p-1">
			{draft.virtualObjects.map(vo => (
				<VirtualObjectCard
					key={vo.id}
					vo={vo}
					expanded={expandedObjects.has(vo.id)}
					actions={actions}
					allObjects={stableObjects}
					allLinks={stableLinks}
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
