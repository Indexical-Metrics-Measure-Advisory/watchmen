import {deleteDerivedObjective} from '@/services/data/tuples/derived-objective';
import {DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {Button} from '@/widgets/basic/button';
import {ICON_THROW_AWAY} from '@/widgets/basic/constants';
import {PageHeaderButton} from '@/widgets/basic/page-header-buttons';
import {ButtonInk} from '@/widgets/basic/types';
import {DialogBody, DialogFooter, DialogLabel} from '@/widgets/dialog/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {useThrottler} from '@/widgets/throttler';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {useEffect} from 'react';
import styled from 'styled-components';
import {useConsoleEventBus} from '../../console-event-bus';
import {ConsoleEventTypes} from '../../console-event-bus-types';

const DeleteDialogBody = styled(DialogBody)`
	flex-direction : column;
	margin-bottom  : var(--margin);
`;
const NameUrl = styled.div`
	color       : var(--info-color);
	font-weight : var(--font-bold);
	padding-top : calc(var(--margin) / 2);
	word-break  : break-all;
	line-height : var(--line-height);
`;

const DerivedObjectiveDelete = (props: { derivedObjective: DerivedObjective, onRemoved: () => void }) => {
	const {derivedObjective, onRemoved} = props;

	const {fire} = useEventBus();

	const onDeleteClicked = async () => {
		fire(EventTypes.HIDE_DIALOG);
		onRemoved();
	};
	const onCancelClicked = () => {
		fire(EventTypes.HIDE_DIALOG);
	};

	return <>
		<DeleteDialogBody>
			<DialogLabel>{Lang.CONSOLE.DERIVED_OBJECTIVE.DELETE_DIALOG_LABEL}</DialogLabel>
			<NameUrl>{derivedObjective.name}</NameUrl>
		</DeleteDialogBody>
		<DialogFooter>
			<Button ink={ButtonInk.DANGER} onClick={onDeleteClicked}>{Lang.ACTIONS.DELETE}</Button>
			<Button ink={ButtonInk.PRIMARY} onClick={onCancelClicked}>{Lang.ACTIONS.CANCEL}</Button>
		</DialogFooter>
	</>;
};

export const HeaderDeleteButton = (props: { derivedObjective: DerivedObjective }) => {
	const {derivedObjective} = props;

	const {fire: fireGlobal} = useEventBus();
	const {fire} = useConsoleEventBus();
	const saveQueue = useThrottler();
	useEffect(() => saveQueue.clear(true), [derivedObjective, saveQueue]);

	const onDeleted = async () => {
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
			saveQueue.clear(false);
			await deleteDerivedObjective(derivedObjective);
		}, () => {
			fire(ConsoleEventTypes.DERIVED_OBJECTIVE_REMOVED_FROM_FAVORITE, derivedObjective.derivedObjectiveId);
			fire(ConsoleEventTypes.DERIVED_OBJECTIVE_REMOVED, derivedObjective);
		});
	};
	const onDeleteClicked = () => {
		fireGlobal(EventTypes.SHOW_DIALOG,
			<DerivedObjectiveDelete derivedObjective={derivedObjective} onRemoved={onDeleted}/>);
	};

	return <PageHeaderButton tooltip={Lang.CONSOLE.DERIVED_OBJECTIVE.DELETE_ME} onClick={onDeleteClicked}>
		<FontAwesomeIcon icon={ICON_THROW_AWAY}/>
	</PageHeaderButton>;
};