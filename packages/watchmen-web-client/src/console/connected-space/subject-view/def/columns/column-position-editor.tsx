import {Subject, SubjectDataSetColumn} from '@/services/data/tuples/subject-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {ICON_MOVE_DOWN, ICON_MOVE_UP} from '@/widgets/basic/constants';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import {useColumnEventBus} from './column-event-bus';
import {ColumnEventTypes} from './column-event-bus-types';
import {ColumnPositionContainer, ColumnPositionMoveDownButton, ColumnPositionMoveUpButton} from './widgets';

export const ColumnPositionEditor = (props: { subject: Subject, column: SubjectDataSetColumn }) => {
	const {subject, column} = props;

	const {fire: fireGlobal} = useEventBus();
	const {fire: fireColumn} = useColumnEventBus();

	const onMoveUpClicked = () => {
		const columns = subject.dataset.columns || [];
		const index = columns.indexOf(column);
		if (index === 0) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
				{Lang.CONSOLE.CONNECTED_SPACE.SUBJECT_COLUMN_POSITION_ALREADY_AT_FIRST}
			</AlertLabel>);
			return;
		}

		columns.splice(index, 1);
		columns.splice(index - 1, 0, column);

		fireColumn(ColumnEventTypes.POSITION_CHANGED, column);
	};
	const onMoveDownClicked = () => {
		const columns = subject.dataset.columns || [];
		const index = columns.indexOf(column);
		if (index === columns.length - 1) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
				{Lang.CONSOLE.CONNECTED_SPACE.SUBJECT_COLUMN_POSITION_ALREADY_AT_LAST}
			</AlertLabel>);
			return;
		}

		columns.splice(index, 1);
		columns.splice(index + 1, 0, column);

		fireColumn(ColumnEventTypes.POSITION_CHANGED, column);
	};

	return <ColumnPositionContainer>
		<ColumnPositionMoveUpButton onClick={onMoveUpClicked}>
			<FontAwesomeIcon icon={ICON_MOVE_UP}/>
		</ColumnPositionMoveUpButton>
		<ColumnPositionMoveDownButton onClick={onMoveDownClicked}>
			<FontAwesomeIcon icon={ICON_MOVE_DOWN}/>
		</ColumnPositionMoveDownButton>
	</ColumnPositionContainer>;
};
