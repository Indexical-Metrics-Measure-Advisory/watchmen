import React, { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Topic } from '@/services/topicService';
import { DataSource } from '@/services/dataSourceService';
import { OntologyGovernanceAttribute, OntologyGovernanceMap } from '@/model/ontology';
import { OntologyDraftApi } from './useOntologyDraft';
import { useStableArray } from './utils';
import { VirtualObjectCard } from './VirtualObjectCard';

/** Stable empty lookup — keeps React.memo effective for objects without governance data. */
const EMPTY_GOVERNANCE: Map<string, OntologyGovernanceAttribute> = new Map();

export const ObjectsTab: React.FC<{
	api: OntologyDraftApi;
	topics: Topic[];
	dataSources: DataSource[];
	topicMap: Map<string, Topic>;
	topicByName: Map<string, Topic>;
	/** Governance projection of the saved ontology; null for unsaved drafts or when loading failed. */
	governance: OntologyGovernanceMap | null;
}> = ({ api, topics, dataSources, topicMap, topicByName, governance }) => {
	const { draft, expandedObjects, actions } = api;
	// key 只覆盖卡片真正消费的字段（对象 id/name、link 的 id/name/两端对象），
	// 其它编辑不会改变引用，React.memo 的卡片即可跳过无关重渲染。
	const stableObjects = useStableArray(draft.virtualObjects, vo => `${vo.id}\n${vo.name}`);
	const stableLinks = useStableArray(
		draft.virtualLinks,
		l => `${l.id}\n${l.name}\n${l.sourceObjectId}\n${l.targetObjectId}`,
	);
	// Pre-build attribute lookups (by object id, falling back to object name) so the
	// maps stay referentially stable and memoized cards do not re-render needlessly.
	const governanceLookup = useMemo(() => {
		if (!governance) return null;
		const byId = new Map<string, Map<string, OntologyGovernanceAttribute>>();
		const byName = new Map<string, Map<string, OntologyGovernanceAttribute>>();
		governance.objects.forEach(obj => {
			const attrs = new Map(obj.attributes.map(a => [a.name, a] as const));
			byId.set(obj.objectId, attrs);
			byName.set(obj.objectName, attrs);
		});
		return { byId, byName };
	}, [governance]);
	const governanceAttrsFor = (objectId: string, objectName: string): Map<string, OntologyGovernanceAttribute> | null => {
		if (!governanceLookup) return null;
		return governanceLookup.byId.get(objectId) ?? governanceLookup.byName.get(objectName) ?? EMPTY_GOVERNANCE;
	};
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
					topicByName={topicByName}
					spaceSelected={!!draft.spaceId}
					governanceAttrs={governanceAttrsFor(vo.id, vo.name)}
				/>
			))}
			<Button variant="outline" className="w-full gap-2" onClick={actions.addObject}>
				<Plus className="w-4 h-4" />
				Add Virtual Object
			</Button>
		</div>
	);
};
