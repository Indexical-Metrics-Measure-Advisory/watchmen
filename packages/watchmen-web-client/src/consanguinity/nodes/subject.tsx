import {ConsanguinityUniqueId} from '@/services/data/tuples/consanguinity';
import {Lang} from '@/widgets/langs';
import {DiagramRelation, DiagramSubject, DiagramSubjectColumn} from '../types';
import {useNodeClick} from './use-node-click';
import {NodeContainer, NodeItem, NodeItems, NodeTitle, NodeWrapper} from './widgets';

const SubjectColumnNode = (props: { subject: DiagramSubject, column: DiagramSubjectColumn }) => {
	const {column} = props;

	const {active, onClick} = useNodeClick(column['@cid']);

	return <NodeItem data-node-type="subject-column" data-node-id={column['@cid']}
	                 data-active={active} onClick={onClick}>
		{(column.alias || '').trim() || Lang.CONSANGUINITY.NONAME_SUBJECT_COLUMN}
	</NodeItem>;
};

export const SubjectNode = (props: { data: DiagramSubject; relations: Array<DiagramRelation> }) => {
	const {data, relations} = props;

	const map = relations.reduce((map, relation) => {
		map[relation.from] = true;
		map[relation.to] = true;
		return map;
	}, {} as Record<ConsanguinityUniqueId, boolean>);
	const columns = (data.columns || []).filter(column => map[column['@cid']] != null);

	return <NodeWrapper>
		<NodeContainer data-node-type="subject" data-node-id={data.subjectId}>
			<NodeTitle>
				{(data.name || '').trim() || Lang.CONSANGUINITY.NONAME_SUBJECT}
			</NodeTitle>
			<NodeItems>
				{columns.map(column => {
					return <SubjectColumnNode subject={data} column={column} key={column.columnId}/>;
				})}
			</NodeItems>
		</NodeContainer>
	</NodeWrapper>;
};
