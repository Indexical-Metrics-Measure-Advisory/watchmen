import {Lang} from '@/widgets/langs';
import {DiagramSubject, DiagramSubjectColumn} from '../types';
import {useNodeClick} from './use-node-click';
import {NodeContainer, NodeItem, NodeItems, NodeTitle} from './widgets';

const SubjectColumnNode = (props: { subject: DiagramSubject, column: DiagramSubjectColumn }) => {
	const {column} = props;

	const {active, onClick} = useNodeClick(column['@cid']);

	return <NodeItem data-node-type="subject-column" data-node-id={column['@cid']}
	                 data-active={active} onClick={onClick}>
		{(column.alias || '').trim() || Lang.CONSANGUINITY.NONAME_SUBJECT_COLUMN}
	</NodeItem>;
};

export const SubjectNode = (props: { data: DiagramSubject }) => {
	const {data} = props;

	return <NodeContainer data-node-type="subject" data-node-id={data.subjectId}>
		<NodeTitle>
			{(data.name || '').trim() || Lang.CONSANGUINITY.NONAME_SUBJECT}
		</NodeTitle>
		<NodeItems>
			{(data.columns || []).map(column => {
				return <SubjectColumnNode subject={data} column={column} key={column.columnId}/>;
			})}
		</NodeItems>
	</NodeContainer>;
};
