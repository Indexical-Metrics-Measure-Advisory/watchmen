import {Lang} from '@/widgets/langs';
import {EditStep} from './edit-step';
import {ObjectiveDeclarationStep} from './steps';
import {EditObjective} from './types';

export const Variables = (props: { data: EditObjective }) => {
	const {data} = props;

	console.log(data);

	return <EditStep index={ObjectiveDeclarationStep.VARIABLES} title={Lang.INDICATOR.OBJECTIVE.VARIABLES_TITLE}>
	</EditStep>;
};