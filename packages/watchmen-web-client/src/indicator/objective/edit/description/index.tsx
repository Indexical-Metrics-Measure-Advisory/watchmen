import {Objective} from '@/services/data/tuples/objective-types';
import {noop} from '@/services/utils';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {ChangeEvent} from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';
import {EditStep} from '../edit-step';
import {ObjectiveDeclarationStep} from '../steps';
import {DescriptionText} from './widgets';

export const Description = (props: { objective: Objective }) => {
	const {objective} = props;

	const {fire} = useObjectivesEventBus();
	const forceUpdate = useForceUpdate();

	const onDescriptionChanged = (event: ChangeEvent<HTMLTextAreaElement>) => {
		const {value} = event.target;

		if (value.length === 0 && (objective.description ?? '').length === 0) {
			return;
		} else if (value === objective.description) {
			return;
		}

		objective.description = value;
		fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		forceUpdate();
	};

	return <EditStep index={ObjectiveDeclarationStep.DESCRIPTION} title={Lang.INDICATOR.OBJECTIVE.DESCRIPTION_TITLE}>
		<DescriptionText value={objective.description ?? ''}
		                 onChange={onDescriptionChanged}
		                 placeholder={Lang.PLAIN.OBJECTIVE_DESCRIPTION_PLACEHOLDER}/>
	</EditStep>;
};