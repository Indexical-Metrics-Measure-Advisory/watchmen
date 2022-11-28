import {Lang} from '@/widgets/langs';
import {EditStep} from './edit-step';
import {ObjectiveDeclarationStep} from './steps';
import {EditObjective} from './types';

export const Factors = (props: { data: EditObjective }) => {
	const {data} = props;

	if (data.objective.factors == null) {
		data.objective.factors = [];
	}

	const factors = data.objective.factors;

	return <EditStep index={ObjectiveDeclarationStep.FACTORS} title={Lang.INDICATOR.OBJECTIVE.FACTORS_TITLE}>
		{factors.map(factor => {
			return null;
		})}
	</EditStep>;
};