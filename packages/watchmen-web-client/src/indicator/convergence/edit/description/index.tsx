import {Convergence} from '@/services/data/tuples/convergence-types';
import {noop} from '@/services/utils';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {ChangeEvent} from 'react';
import {useConvergencesEventBus} from '../../convergences-event-bus';
import {ConvergencesEventTypes} from '../../convergences-event-bus-types';
import {EditStep} from '../edit-step';
import {ConvergenceDeclarationStep} from '../steps';
import {DescriptionText} from './widgets';

export const Description = (props: { convergence: Convergence }) => {
	const {convergence} = props;

	const {fire} = useConvergencesEventBus();
	const forceUpdate = useForceUpdate();

	const onDescriptionChanged = (event: ChangeEvent<HTMLTextAreaElement>) => {
		const {value} = event.target;

		if (value.length === 0 && (convergence.description ?? '').length === 0) {
			return;
		} else if (value === convergence.description) {
			return;
		}

		convergence.description = value;
		fire(ConvergencesEventTypes.SAVE_CONVERGENCE, convergence, noop);
		forceUpdate();
	};

	return <EditStep index={ConvergenceDeclarationStep.DESCRIPTION}
	                 title={Lang.INDICATOR.CONVERGENCE.DESCRIPTION_TITLE}>
		<DescriptionText value={convergence.description ?? ''}
		                 onChange={onDescriptionChanged}
		                 placeholder={Lang.PLAIN.CONVERGENCE_DESCRIPTION_PLACEHOLDER}/>
	</EditStep>;
};