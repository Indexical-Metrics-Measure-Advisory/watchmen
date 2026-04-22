import {ConnectedSpace} from '@/services/data/tuples/connected-space-types';
import {Subject} from '@/services/data/tuples/subject-types';
import {ICON_DSL} from '@/widgets/basic/constants';
import {PageHeaderButton} from '@/widgets/basic/page-header-buttons';
import {Lang} from '@/widgets/langs';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import {fetchSubjectViewSql} from '@/services/data/console/subject';
import {ViewSqlDialog} from './view-sql-dialog';

export const HeaderViewSqlButton = (props: { connectedSpace: ConnectedSpace, subject: Subject }) => {
	const {subject} = props;

	const {fire: fireGlobal} = useEventBus();

	const onViewSqlClicked = async () => {
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => fetchSubjectViewSql({subjectId: subject.subjectId}),
			(sql) => {
				fireGlobal(EventTypes.SHOW_DIALOG,
					<ViewSqlDialog sql={sql}/>,
					{width: '800px', marginLeft: 'calc(50vw - 400px)'});
			},
			undefined,
			true);
	};

	return <PageHeaderButton tooltip={Lang.CONSOLE.CONNECTED_SPACE.VIEW_SQL}
	                     onClick={onViewSqlClicked}>
		<FontAwesomeIcon icon={ICON_DSL}/>
	</PageHeaderButton>;
};
