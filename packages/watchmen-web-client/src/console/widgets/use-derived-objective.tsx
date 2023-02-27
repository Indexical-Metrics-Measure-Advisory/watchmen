import {toDerivedObjective} from '@/routes/utils';
import {connectAsDerivedObjective} from '@/services/data/tuples/derived-objective';
import {DerivedObjective, DerivedObjectiveId} from '@/services/data/tuples/derived-objective-types';
import {Objective} from '@/services/data/tuples/objective-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {Button} from '@/widgets/basic/button';
import {CheckBox} from '@/widgets/basic/checkbox';
import {ButtonInk} from '@/widgets/basic/types';
import {DialogFooter, DialogLabel} from '@/widgets/dialog/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useConsoleEventBus} from '../console-event-bus';
import {ConsoleEventTypes} from '../console-event-bus-types';
import {createDerivedObjective} from '../utils/tuples';
import {
	AvailableTemplateTable,
	AvailableTemplateTableCell,
	AvailableTemplateTableHeaderCell,
	AvailableTemplateTableRow,
	ErrorMessage,
	ShareDialogBody
} from './widget';

const AvailableTemplatesSelector = (props: {
	templates: Array<Objective>;
	switchTo: (derivedObjective: DerivedObjective) => void;
}) => {
	const {templates, switchTo} = props;

	const {fire} = useEventBus();
	const [message, setMessage] = useState<string | null>(null);
	const [selectedObjectiveId, setSelectedObjectiveId] = useState<DerivedObjectiveId | null>(null);

	const isTemplateSelected = (derivedObjectiveId: DerivedObjectiveId) => {
		// eslint-disable-next-line eqeqeq
		return derivedObjectiveId == selectedObjectiveId;
	};
	const onTemplateSelected = (derivedObjectiveId: DerivedObjectiveId) => (value: boolean) => {
		if (value) {
			setSelectedObjectiveId(derivedObjectiveId);
			setMessage(null);
		} else {
			setSelectedObjectiveId(null);
		}
	};
	const onConfirmClicked = async () => {
		if (selectedObjectiveId == null) {
			setMessage(Lang.CONSOLE.DERIVED_OBJECTIVE.NO_OBJECTIVE_SELECTED);
			return;
		}
		fire(EventTypes.HIDE_DIALOG);
		// eslint-disable-next-line eqeqeq
		const derivedObjective = createDerivedObjective(templates.find(template => template.objectiveId == selectedObjectiveId)!);
		fire(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await connectAsDerivedObjective(derivedObjective),
			() => switchTo(derivedObjective));
	};
	const onCancelClicked = () => {
		fire(EventTypes.HIDE_DIALOG);
	};

	return <>
		<ShareDialogBody>
			<DialogLabel>{Lang.CONSOLE.DERIVED_OBJECTIVE.CREATE_DIALOG_CHOOSE_TEMPLATE_LABEL}</DialogLabel>
			<AvailableTemplateTable>
				<AvailableTemplateTableRow>
					<AvailableTemplateTableHeaderCell/>
					<AvailableTemplateTableHeaderCell/>
					<AvailableTemplateTableHeaderCell>{Lang.CONSOLE.DERIVED_OBJECTIVE.TEMPLATE}</AvailableTemplateTableHeaderCell>
				</AvailableTemplateTableRow>
				{templates.map((template, index) => {
					return <AvailableTemplateTableRow key={template.objectiveId}>
						<AvailableTemplateTableCell>{index + 1}</AvailableTemplateTableCell>
						<AvailableTemplateTableCell>
							<CheckBox value={isTemplateSelected(template.objectiveId)}
							          onChange={onTemplateSelected(template.objectiveId)}/>
						</AvailableTemplateTableCell>
						<AvailableTemplateTableCell>{template.name || 'Noname'}</AvailableTemplateTableCell>
					</AvailableTemplateTableRow>;
				})}
			</AvailableTemplateTable>
			{message == null ? null : <ErrorMessage>{message}</ErrorMessage>}
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
					<AvailableTemplatesSelector templates={availableObjectives} switchTo={onSwitchTo}/>);
			}
		});
	};
};
