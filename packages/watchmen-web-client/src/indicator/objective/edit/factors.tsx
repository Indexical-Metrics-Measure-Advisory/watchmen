import {Objective} from '@/services/data/tuples/objective-types';
import {Lang} from '@/widgets/langs';
import {EditStep} from './edit-step';
import {ObjectiveDeclarationStep} from './steps';

export const Factors = (props: { objective: Objective }) => {
	const {objective} = props;

	if (objective.factors == null) {
		objective.factors = [];
	}

	const factors = objective.factors;

	return <EditStep index={ObjectiveDeclarationStep.FACTORS} title={Lang.INDICATOR.OBJECTIVE.FACTORS_TITLE}>
		{factors.map(factor => {
			return null;
		})}
	</EditStep>;
};