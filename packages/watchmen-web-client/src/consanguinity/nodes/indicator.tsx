import {Lang} from '@/widgets/langs';
import {DiagramIndicator} from '../types';
import {useNodeClick} from './use-node-click';
import {NodeContainer, NodeTitle} from './widgets';

export const IndicatorNode = (props: { data: DiagramIndicator }) => {
	const {data} = props;

	const {active, onClick} = useNodeClick(data['@cid']);

	return <NodeContainer data-node-type="indicator" data-node-id={data['@cid']}
	                      data-active={active} onClick={onClick}>
		<NodeTitle>
			{(data.name || '').trim() || Lang.CONSANGUINITY.NONAME_INDICATOR}
		</NodeTitle>
	</NodeContainer>;
};