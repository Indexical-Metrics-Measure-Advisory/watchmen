import {Lang} from '@/widgets/langs';
import {DiagramObjectiveFactor} from '../types';
import {NodeContainer, NodeTitle} from './widgets';

export const ObjectiveFactorNode = (props: { data: DiagramObjectiveFactor }) => {
	const {data} = props;

	return <NodeContainer data-node-type="objective-factor" data-node-id={data['@cid']}>
		<NodeTitle>
			{(data.name || '').trim() || Lang.CONSANGUINITY.NONAME_OBJECTIVE_FACTOR}
		</NodeTitle>
	</NodeContainer>;
};