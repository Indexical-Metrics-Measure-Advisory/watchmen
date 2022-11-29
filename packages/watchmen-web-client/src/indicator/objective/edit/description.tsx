import {Lang} from '@/widgets/langs';
import {ChangeEvent} from 'react';
import {EditStep} from './edit-step';
import {ObjectiveDeclarationStep} from './steps';
import {EditObjective} from './types';
import {useSave} from './use-save';
import {DescriptionText} from './widgets';

export const Description = (props: { data: EditObjective }) => {
	const {data} = props;

	const save = useSave();

	const onDescriptionChanged = (event: ChangeEvent<HTMLTextAreaElement>) => {
		const {value} = event.target;

		if (value.length === 0 && (data.objective?.description ?? '').length === 0) {
			return;
		} else if (value === data.objective?.description) {
			return;
		}

		data.objective!.description = value;
		save(data.objective);
	};

	return <EditStep index={ObjectiveDeclarationStep.DESCRIPTION} title={Lang.INDICATOR.OBJECTIVE.DESCRIPTION_TITLE}>
		<DescriptionText value={data.objective?.description ?? ''}
		                 onChange={onDescriptionChanged}
		                 placeholder={Lang.PLAIN.OBJECTIVE_DESCRIPTION_PLACEHOLDER}/>
	</EditStep>;
};