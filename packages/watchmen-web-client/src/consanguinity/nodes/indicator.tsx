import {Lang} from '@/widgets/langs';
import {DiagramIndicator} from '../types';
import {NodeContainer, NodeTitle} from './widgets';

export const IndicatorNode = (props: { data: DiagramIndicator }) => {
	const {data} = props;

	return <NodeContainer data-node-type="indicator" data-node-id={data['@cid']}>
		<NodeTitle>
			{(data.name || '').trim() || Lang.CONSANGUINITY.NONAME_INDICATOR}
		</NodeTitle>
	</NodeContainer>;
};