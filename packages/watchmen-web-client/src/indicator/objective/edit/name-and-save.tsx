import {EditStep} from '@/indicator/objective/edit/edit-step';
import {useObjectivesEventBus} from '@/indicator/objective/objectives-event-bus';
import {ObjectivesEventTypes} from '@/indicator/objective/objectives-event-bus-types';
import {noop} from '@/services/utils';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {useThrottler} from '@/widgets/throttler';
import {ChangeEvent} from 'react';
import {ObjectiveDeclarationStep} from './steps';
import {EditObjective} from './types';
import {NameInput} from './widgets';

export const NameAndSave = (props: { data: EditObjective }) => {
	const {data} = props;

	const {fire} = useObjectivesEventBus();
	const saveQueue = useThrottler();
	const forceUpdate = useForceUpdate();

	const onNameChanged = (event: ChangeEvent<HTMLInputElement>) => {
		const {value} = event.target;

		data.objective.name = value;
		saveQueue.replace(() => {
			fire(ObjectivesEventTypes.SAVE_OBJECTIVE, data.objective, noop);
		}, 500);
		forceUpdate();
	};

	const name = data.objective.name || '';

	return <EditStep index={ObjectiveDeclarationStep.NAME} title={Lang.INDICATOR.OBJECTIVE.NAME_TITLE}>
		<NameInput value={name} onChange={onNameChanged} placeholder={Lang.PLAIN.OBJECTIVE_NAME_PLACEHOLDER}/>
	</EditStep>;
};