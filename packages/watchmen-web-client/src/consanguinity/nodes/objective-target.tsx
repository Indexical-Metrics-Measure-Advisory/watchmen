import {Lang} from '@/widgets/langs';
import {DiagramObjectiveTarget} from '../types';
import {useNodeClick} from './use-node-click';
import {NodeContainer, NodeTitle} from './widgets';

export const ObjectiveTargetNode = (props: { data: DiagramObjectiveTarget }) => {
	const {data} = props;

	const {selected, onClick} = useNodeClick(data['@cid']);

	return <NodeContainer data-node-type="objective-target" data-node-id={data['@cid']}
	                      data-selected={selected} onClick={onClick}>
		<NodeTitle>
			{(data.name || '').trim() || Lang.CONSANGUINITY.NONAME_OBJECTIVE_TARGET}
		</NodeTitle>
	</NodeContainer>;
};