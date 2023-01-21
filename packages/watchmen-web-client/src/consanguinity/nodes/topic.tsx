import {Lang} from '@/widgets/langs';
import {DiagramTopic, DiagramTopicFactor} from '../types';
import {useNodeClick} from './use-node-click';
import {NodeContainer, NodeItem, NodeItems, NodeTitle} from './widgets';

const TopicFactorNode = (props: { topic: DiagramTopic, factor: DiagramTopicFactor }) => {
	const {factor} = props;

	const {active, onClick} = useNodeClick(factor['@cid']);

	return <NodeItem data-node-type="topic-factor" data-node-id={factor['@cid']}
	                 data-active={active} onClick={onClick}>
		{(factor.name || '').trim() || Lang.CONSANGUINITY.NONAME_TOPIC_FACTOR}
	</NodeItem>;
};

export const TopicNode = (props: { data: DiagramTopic }) => {
	const {data} = props;

	return <NodeContainer data-node-type="topic" data-node-id={data.topicId}>
		<NodeTitle>
			{(data.name || '').trim() || Lang.CONSANGUINITY.NONAME_TOPIC}
		</NodeTitle>
		<NodeItems>
			{(data.factors || []).map(factor => {
				return <TopicFactorNode topic={data} factor={factor} key={factor.factorId}/>;
			})}
		</NodeItems>
	</NodeContainer>;
};