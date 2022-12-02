import {Objective} from '@/services/data/tuples/objective-types';
import {Lang} from '@/widgets/langs';
import {ChangeEvent} from 'react';
import {EditStep} from './edit-step';
import {ObjectiveDeclarationStep} from './steps';
import {useSave} from './use-save';
import {NameInput} from './widgets';

export const NameAndSave = (props: { objective: Objective }) => {
	const {objective} = props;

	const save = useSave();

	const onNameChanged = (event: ChangeEvent<HTMLInputElement>) => {
		const {value} = event.target;

		objective.name = value;
		save(objective);
	};

	const name = objective.name || '';

	return <EditStep index={ObjectiveDeclarationStep.NAME} title={Lang.INDICATOR.OBJECTIVE.NAME_TITLE}>
		<NameInput value={name} onChange={onNameChanged} placeholder={Lang.PLAIN.OBJECTIVE_NAME_PLACEHOLDER}/>
	</EditStep>;
};