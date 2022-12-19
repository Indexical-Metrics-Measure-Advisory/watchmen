import {Objective} from '@/services/data/tuples/objective-types';
import {Lang} from '@/widgets/langs';
import {ChangeEvent} from 'react';
import {EditStep} from '../edit-step';
import {ObjectiveDeclarationStep} from '../steps';
import {useSave} from '../use-save';
import {DescriptionText} from './widgets';

export const Description = (props: { objective: Objective }) => {
	const {objective} = props;

	const save = useSave();

	const onDescriptionChanged = (event: ChangeEvent<HTMLTextAreaElement>) => {
		const {value} = event.target;

		if (value.length === 0 && (objective.description ?? '').length === 0) {
			return;
		} else if (value === objective.description) {
			return;
		}

		objective.description = value;
		save(objective);
	};

	return <EditStep index={ObjectiveDeclarationStep.DESCRIPTION} title={Lang.INDICATOR.OBJECTIVE.DESCRIPTION_TITLE}>
		<DescriptionText value={objective.description ?? ''}
		                 onChange={onDescriptionChanged}
		                 placeholder={Lang.PLAIN.OBJECTIVE_DESCRIPTION_PLACEHOLDER}/>
	</EditStep>;
};