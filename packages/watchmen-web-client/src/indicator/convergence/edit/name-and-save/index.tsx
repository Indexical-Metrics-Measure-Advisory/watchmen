import {Convergence} from '@/services/data/tuples/convergence-types';
import {noop} from '@/services/utils';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {ChangeEvent} from 'react';
import {useConvergencesEventBus} from '../../convergences-event-bus';
import {ConvergencesEventTypes} from '../../convergences-event-bus-types';
import {EditStep} from '../edit-step';
import {ConvergenceDeclarationStep} from '../steps';
import {NameInput} from './widgets';

export const NameAndSave = (props: { convergence: Convergence }) => {
	const {convergence} = props;

	const {fire} = useConvergencesEventBus();
	const forceUpdate = useForceUpdate();

	const onNameChanged = (event: ChangeEvent<HTMLInputElement>) => {
		const {value} = event.target;

		convergence.name = value;
		fire(ConvergencesEventTypes.SAVE_CONVERGENCE, convergence, noop);
		forceUpdate();
	};

	const name = convergence.name || '';

	return <EditStep index={ConvergenceDeclarationStep.NAME} title={Lang.INDICATOR.CONVERGENCE.NAME_TITLE}>
		<NameInput value={name} onChange={onNameChanged} placeholder={Lang.PLAIN.CONVERGENCE_NAME_PLACEHOLDER}/>
	</EditStep>;
};