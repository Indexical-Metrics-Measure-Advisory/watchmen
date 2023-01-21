import {Lang} from '@/widgets/langs';
import {DiagramObjectiveFactor} from '../types';
import {useNodeClick} from './use-node-click';
import {NodeContainer, NodeTitle} from './widgets';

export const ObjectiveFactorNode = (props: { data: DiagramObjectiveFactor }) => {
	const {data} = props;

	const {selected, onClick} = useNodeClick(data['@cid']);

	return <NodeContainer data-node-type="objective-factor" data-node-id={data['@cid']}
	                      data-selected={selected} onClick={onClick}>
		<NodeTitle>
			{(data.name || '').trim() || Lang.CONSANGUINITY.NONAME_OBJECTIVE_FACTOR}
		</NodeTitle>
	</NodeContainer>;
};