import {Lang} from '@/widgets/langs';
import {DiagramSubject} from '../types';
import {NodeContainer, NodeTitle} from './widgets';

export const SubjectNode = (props: { data: DiagramSubject }) => {
	const {data} = props;

	return <NodeContainer data-node-type="subject" data-node-id={data.subjectId}>
		<NodeTitle>
			{(data.name || '').trim() || Lang.CONSANGUINITY.NONAME_SUBJECT}
		</NodeTitle>
	</NodeContainer>;
};