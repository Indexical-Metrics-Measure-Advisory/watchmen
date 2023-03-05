import {toDerivedObjective} from '@/routes/utils';
import {connectAsDerivedObjective} from '@/services/data/tuples/derived-objective';
import {DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {Objective} from '@/services/data/tuples/objective-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {Button} from '@/widgets/basic/button';
import {ButtonInk, DropdownOption} from '@/widgets/basic/types';
import {DialogFooter, DialogLabel} from '@/widgets/dialog/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useConsoleEventBus} from '../console-event-bus';
import {ConsoleEventTypes} from '../console-event-bus-types';
import {createDerivedObjective} from '../utils/tuples';
import {AvailableObjectiveDropdown, ShareDialogBody} from './widget';

const AvailableTemplatesSelector = (props: {
	objectives: Array<Objective>;
	switchTo: (derivedObjective: DerivedObjective) => void;
}) => {
	const {objectives, switchTo} = props;

	const {fire} = useEventBus();
	const [selection, setSelection] = useState(objectives[0]);

	const onChange = (option: DropdownOption) => {
		setSelection(option.value as Objective);
	};
	const onConfirmClicked = async () => {
		const derivedObjective = createDerivedObjective(selection);
		fire(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await connectAsDerivedObjective(derivedObjective),
			() => {
				fire(EventTypes.HIDE_DIALOG);
				switchTo(derivedObjective);
			});
	};
	const onCancelClicked = () => {
		fire(EventTypes.HIDE_DIALOG);
	};

	const options = objectives.map(objective => {
		return {
			value: objective,
			label: objective.name,
			key: objective.objectiveId
		};
	});

	return <>
		<ShareDialogBody>
			<DialogLabel>{Lang.CONSOLE.DERIVED_OBJECTIVE.CREATE_DIALOG_CHOOSE_TEMPLATE_LABEL}</DialogLabel>
			<AvailableObjectiveDropdown value={selection} options={options} onChange={onChange}/>
		</ShareDialogBody>
		<DialogFooter>
			<Button ink={ButtonInk.PRIMARY} onClick={onConfirmClicked}>{Lang.ACTIONS.CONFIRM}</Button>
			<Button ink={ButtonInk.WAIVE} onClick={onCancelClicked}>{Lang.ACTIONS.CANCEL}</Button>
		</DialogFooter>
	</>;
};

export const useDerivedObjective = () => {
	const navigate = useNavigate();
	const {fire: fireGlobal} = useEventBus();
	const {fire} = useConsoleEventBus();

	const onSwitchTo = (derivedObjective: DerivedObjective) => {
		fire(ConsoleEventTypes.DERIVED_OBJECTIVE_CREATED, derivedObjective);
		navigate(toDerivedObjective(derivedObjective.derivedObjectiveId));
	};
	return () => {
		fire(ConsoleEventTypes.ASK_AVAILABLE_OBJECTIVES, (availableObjectives: Array<Objective>) => {
			// eslint-disable-next-line
			const candidates = availableObjectives.sort((d1, d2) => {
				return d1.name.toLowerCase().localeCompare(d2.name.toLowerCase());
			});
			if (candidates.length === 0) {
				// no other
				fireGlobal(EventTypes.SHOW_ALERT,
					<AlertLabel>{Lang.CONSOLE.DERIVED_OBJECTIVE.NO_MORE_OBJECTIVE}</AlertLabel>);
			} else {
				fireGlobal(EventTypes.SHOW_DIALOG,
					<AvailableTemplatesSelector objectives={availableObjectives} switchTo={onSwitchTo}/>);
			}
		});
	};
};
