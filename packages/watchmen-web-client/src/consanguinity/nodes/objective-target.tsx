import {Lang} from '@/widgets/langs';
import {DiagramObjectiveTarget} from '../types';
import {NodeContainer, NodeTitle} from './widgets';

export const ObjectiveTargetNode = (props: { data: DiagramObjectiveTarget }) => {
	const {data} = props;

	return <NodeContainer data-node-type="objective-target" data-node-id={data['@cid']}>
		<NodeTitle>
			{(data.name || '').trim() || Lang.CONSANGUINITY.NONAME_OBJECTIVE_TARGET}
		</NodeTitle>
	</NodeContainer>;
};