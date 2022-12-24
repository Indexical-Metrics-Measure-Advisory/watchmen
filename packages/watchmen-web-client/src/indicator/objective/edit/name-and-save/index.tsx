import {Objective} from '@/services/data/tuples/objective-types';
import {noop} from '@/services/utils';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {ChangeEvent} from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';
import {EditStep} from '../edit-step';
import {ObjectiveDeclarationStep} from '../steps';
import {NameInput} from './widgets';

export const NameAndSave = (props: { objective: Objective }) => {
	const {objective} = props;

	const {fire} = useObjectivesEventBus();
	const forceUpdate = useForceUpdate();

	const onNameChanged = (event: ChangeEvent<HTMLInputElement>) => {
		const {value} = event.target;

		objective.name = value;
		fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		forceUpdate();
	};

	const name = objective.name || '';

	return <EditStep index={ObjectiveDeclarationStep.NAME} title={Lang.INDICATOR.OBJECTIVE.NAME_TITLE}>
		<NameInput value={name} onChange={onNameChanged} placeholder={Lang.PLAIN.OBJECTIVE_NAME_PLACEHOLDER}/>
	</EditStep>;
};