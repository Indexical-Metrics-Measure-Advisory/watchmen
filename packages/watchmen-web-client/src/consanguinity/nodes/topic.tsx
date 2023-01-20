import {Lang} from '@/widgets/langs';
import {DiagramTopic} from '../types';
import {NodeContainer, NodeTitle} from './widgets';

export const TopicNode = (props: { data: DiagramTopic }) => {
	const {data} = props;

	return <NodeContainer data-node-type="topic" data-node-id={data.topicId}>
		<NodeTitle>
			{(data.name || '').trim() || Lang.CONSANGUINITY.NONAME_TOPIC}
		</NodeTitle>
	</NodeContainer>;
};