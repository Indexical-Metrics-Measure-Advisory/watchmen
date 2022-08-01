import {saveAchievement} from '@/services/data/tuples/achievement';
import {Achievement} from '@/services/data/tuples/achievement-types';
import {noop} from '@/services/utils';
import {Button} from '@/widgets/basic/button';
import {ButtonInk} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {DialogBody, DialogFooter, DialogHeader, DialogTitle} from '@/widgets/dialog/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import React, {ChangeEvent, useState} from 'react';
import styled from 'styled-components';
import {useAchievementEventBus} from '../../../../achievement/achievement-event-bus';
import {AchievementEventTypes} from '../../../../achievement/achievement-event-bus-types';
import {
	AchievementButton,
	AchievementEntityLabel,
	AchievementInput,
	AchievementLabel,
	CreateOrFindContainer,
	OrLabel
} from './widgets';

const NameInput = styled(AchievementInput)`
	padding : 0;
	width   : 100%;
`;
const ErrorLabel = styled(AchievementLabel)`
	color      : var(--danger-color);
	opacity    : 1;
	transition : opacity 300ms ease-in-out;
	&:empty {
		opacity : 0;
	}
	&:not(:empty) {
		margin-bottom : calc(var(--margin) / 2);
	}
`;

const NameDialog = (props: { achievement: Achievement; onNamed: () => void; }) => {
	const {achievement, onNamed} = props;

	const {fire} = useEventBus();
	const [name, setName] = useState(achievement.name ?? '');
	const [error, setError] = useState('');

	const onNameChanged = (event: ChangeEvent<HTMLInputElement>) => {
		const {value} = event.target;
		setName(value);
		if (value.trim().length !== 0) {
			setError('');
		}
	};
	const onConfirmClicked = () => {
		if (name.trim().length === 0) {
			setError(Lang.INDICATOR.ACHIEVEMENT.NAME_IS_REQUIRED);
			return;
		}

		achievement.name = name.trim();
		onNamed();
	};
	const onCancelClicked = () => {
		fire(EventTypes.HIDE_DIALOG);
	};

	return <>
		<DialogHeader>
			<DialogTitle>{Lang.INDICATOR.ACHIEVEMENT.SET_NAME_LABEL}</DialogTitle>
		</DialogHeader>
		<DialogBody>
			<NameInput value={name} onChange={onNameChanged}/>
			<ErrorLabel>{error}</ErrorLabel>
		</DialogBody>
		<DialogFooter>
			<Button ink={ButtonInk.PRIMARY} onClick={onConfirmClicked}>{Lang.ACTIONS.CONFIRM}</Button>
			<Button ink={ButtonInk.WAIVE} onClick={onCancelClicked}>{Lang.ACTIONS.CANCEL}</Button>
		</DialogFooter>
	</>;
};

export const CreateOrFindViewer = (props: {
	achievement: Achievement;
	onCleared: () => void;
	reusable: boolean;
}) => {
	const {achievement, onCleared, reusable} = props;

	const {fire: fireGlobal} = useEventBus();
	const {fire} = useAchievementEventBus();
	const forceUpdate = useForceUpdate();

	const onNamed = () => {
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
			await saveAchievement(achievement);
		}, () => {
			forceUpdate();
			fire(AchievementEventTypes.NAME_CHANGED, achievement, noop);
			fireGlobal(EventTypes.HIDE_DIALOG);
		});
	};
	const onRenameClicked = () => {
		fireGlobal(EventTypes.SHOW_DIALOG, <NameDialog achievement={achievement} onNamed={onNamed}/>);
	};
	const onPickAnotherClicked = () => {
		onCleared();
	};

	const name = achievement.name || Lang.INDICATOR.ACHIEVEMENT.NONAME_ON_ACHIEVEMENT;
	const hasName = !!achievement.name;

	return <CreateOrFindContainer>
		<AchievementLabel>{Lang.INDICATOR.ACHIEVEMENT.PICKED_ACHIEVEMENT_LABEL}</AchievementLabel>
		<AchievementEntityLabel>{name}</AchievementEntityLabel>
		<AchievementButton ink={ButtonInk.PRIMARY} onClick={onRenameClicked} data-hide-on-print={true}>
			{hasName ? Lang.INDICATOR.ACHIEVEMENT.RENAME : Lang.INDICATOR.ACHIEVEMENT.NEW_NAME}
		</AchievementButton>
		{reusable
			? <>
				<OrLabel>{Lang.INDICATOR.ACHIEVEMENT.OR}</OrLabel>
				<AchievementButton ink={ButtonInk.WAIVE} onClick={onPickAnotherClicked} data-hide-on-print={true}>
					{Lang.INDICATOR.ACHIEVEMENT.PICK_ANOTHER}
				</AchievementButton>
			</>
			: null}
	</CreateOrFindContainer>;
};