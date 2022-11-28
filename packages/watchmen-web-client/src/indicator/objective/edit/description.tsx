import {noop} from '@/services/utils';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {useThrottler} from '@/widgets/throttler';
import {ChangeEvent} from 'react';
import {useObjectivesEventBus} from '../objectives-event-bus';
import {ObjectivesEventTypes} from '../objectives-event-bus-types';
import {EditStep} from './edit-step';
import {ObjectiveDeclarationStep} from './steps';
import {EditObjective} from './types';
import {DescriptionText} from './widgets';

export const Description = (props: { data: EditObjective }) => {
	const {data} = props;

	const {fire} = useObjectivesEventBus();
	const saveQueue = useThrottler();
	const forceUpdate = useForceUpdate();

	const onDescriptionChanged = (event: ChangeEvent<HTMLTextAreaElement>) => {
		const {value} = event.target;

		if (value.length === 0 && (data.objective?.description ?? '').length === 0) {
			return;
		} else if (value === data.objective?.description) {
			return;
		}

		data.objective!.description = value;
		saveQueue.replace(() => {
			fire(ObjectivesEventTypes.SAVE_OBJECTIVE, data.objective, noop);
		}, 500);
		forceUpdate();
	};

	return <EditStep index={ObjectiveDeclarationStep.DESCRIPTION} title={Lang.INDICATOR.OBJECTIVE.DESCRIPTION_TITLE}>
		<DescriptionText value={data.objective?.description ?? ''}
		                 onChange={onDescriptionChanged}
		                 placeholder={Lang.PLAIN.OBJECTIVE_DESCRIPTION_PLACEHOLDER}/>
	</EditStep>;
};