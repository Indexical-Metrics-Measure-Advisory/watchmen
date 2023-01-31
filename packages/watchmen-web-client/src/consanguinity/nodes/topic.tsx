import {ConsanguinityUniqueId} from '@/services/data/tuples/consanguinity-types';
import {Lang} from '@/widgets/langs';
import React from 'react';
import {DiagramRelation, DiagramTopic, DiagramTopicFactor} from '../types';
import {useNodeClick} from './use-node-click';
import {NodeContainer, NodeItem, NodeItems, NodeTitle, NodeWrapper} from './widgets';

const TopicFactorNode = (props: { topic: DiagramTopic, factor: DiagramTopicFactor }) => {
	const {factor} = props;

	const {active, onClick} = useNodeClick(factor['@cid']);

	return <NodeItem data-node-type="topic-factor" data-node-id={factor['@cid']}
	                 data-active={active} onClick={onClick}>
		{(factor.name || '').trim() || Lang.CONSANGUINITY.NONAME_TOPIC_FACTOR}
	</NodeItem>;
};

export const TopicNode = (props: { data: DiagramTopic; relations: Array<DiagramRelation> }) => {
	const {data, relations} = props;

	const map = relations.reduce((map, relation) => {
		map[relation.from] = true;
		map[relation.to] = true;
		return map;
	}, {} as Record<ConsanguinityUniqueId, boolean>);
	const factors = (data.factors || []).filter(factor => map[factor['@cid']] != null);

	return <NodeWrapper>
		<NodeContainer data-node-type="topic" data-node-id={data.topicId}>
			<NodeTitle>
				{(data.name || '').trim() || Lang.CONSANGUINITY.NONAME_TOPIC}
			</NodeTitle>
			<NodeItems>
				{factors.map(factor => {
					return <TopicFactorNode topic={data} factor={factor} key={factor.factorId}/>;
				})}
			</NodeItems>
		</NodeContainer>
	</NodeWrapper>;
};