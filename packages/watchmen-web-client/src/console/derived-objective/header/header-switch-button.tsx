import {toDerivedObjective} from '@/routes/utils';
import {DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {Button} from '@/widgets/basic/button';
import {ICON_SWITCH} from '@/widgets/basic/constants';
import {Dropdown} from '@/widgets/basic/dropdown';
import {PageHeaderButton} from '@/widgets/basic/page-header-buttons';
import {ButtonInk, DropdownOption} from '@/widgets/basic/types';
import {DialogBody, DialogFooter, DialogLabel} from '@/widgets/dialog/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import styled from 'styled-components';
import {useConsoleEventBus} from '../../console-event-bus';
import {ConsoleEventTypes} from '../../console-event-bus-types';

const SwitchDialogBody = styled(DialogBody)`
	flex-direction : column;
	margin-bottom  : var(--margin);
`;
const DerivedObjectiveDropdown = styled(Dropdown)`
	margin-top : calc(var(--margin) / 4);
`;

const DerivedObjectiveSwitch = (props: { derivedObjectives: Array<DerivedObjective>, switchTo: (derivedObjective: DerivedObjective) => void }) => {
	const {derivedObjectives, switchTo} = props;

	const {fire} = useEventBus();
	const [selection, setSelection] = useState(derivedObjectives[0]);

	const onChange = (option: DropdownOption) => {
		setSelection(option.value as DerivedObjective);
	};
	const onConfirmClicked = () => {
		switchTo(selection);
		fire(EventTypes.HIDE_DIALOG);
	};
	const onCancelClicked = () => {
		fire(EventTypes.HIDE_DIALOG);
	};

	const options = derivedObjectives.map(derivedObjective => {
		return {
			value: derivedObjective,
			label: derivedObjective.name,
			key: derivedObjective.derivedObjectiveId
		};
	});

	return <>
		<SwitchDialogBody>
			<DialogLabel>{Lang.CONSOLE.DERIVED_OBJECTIVE.SWITCH_DIALOG_LABEL}</DialogLabel>
			<DerivedObjectiveDropdown value={selection} options={options} onChange={onChange}/>
		</SwitchDialogBody>
		<DialogFooter>
			<Button ink={ButtonInk.PRIMARY} onClick={onConfirmClicked}>{Lang.ACTIONS.CONFIRM}</Button>
			<Button ink={ButtonInk.WAIVE} onClick={onCancelClicked}>{Lang.ACTIONS.CANCEL}</Button>
		</DialogFooter>
	</>;
};

export const HeaderSwitchButton = (props: { derivedObjective: DerivedObjective }) => {
	const {derivedObjective} = props;

	const navigate = useNavigate();
	const {fire: fireGlobal} = useEventBus();
	const {fire} = useConsoleEventBus();

	const onSwitchTo = (derivedObjective: DerivedObjective) => {
		navigate(toDerivedObjective(derivedObjective.derivedObjectiveId));
	};
	const onSwitchDerivedObjectiveClicked = () => {
		fire(ConsoleEventTypes.ASK_DERIVED_OBJECTIVES, (derivedObjectives: Array<DerivedObjective>) => {
			// eslint-disable-next-line
			const candidates = derivedObjectives.sort((d1, d2) => {
				return d1.name.toLowerCase().localeCompare(d2.name.toLowerCase());
			}).filter(exists => exists !== derivedObjective);
			if (candidates.length === 0) {
				// no other
				fireGlobal(EventTypes.SHOW_ALERT,
					<AlertLabel>{Lang.CONSOLE.DERIVED_OBJECTIVE.NO_MORE_OBJECTIVE}</AlertLabel>);
			} else {
				fireGlobal(EventTypes.SHOW_DIALOG,
					<DerivedObjectiveSwitch derivedObjectives={candidates} switchTo={onSwitchTo}/>);
			}
		});
	};

	return <PageHeaderButton tooltip={Lang.CONSOLE.DERIVED_OBJECTIVE.SWITCH_DERIVED_OBJECTIVE}
	                         onClick={onSwitchDerivedObjectiveClicked}>
		<FontAwesomeIcon icon={ICON_SWITCH}/>
	</PageHeaderButton>;
};