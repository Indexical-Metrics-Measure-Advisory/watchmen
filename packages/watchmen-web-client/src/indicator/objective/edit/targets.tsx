import {Lang} from '@/widgets/langs';
import {EditStep} from './edit-step';
import {ObjectiveDeclarationStep} from './steps';
import {EditObjective} from './types';

export const Targets = (props: { data: EditObjective }) => {
	const {data} = props;

	if (data.objective.targets == null) {
		data.objective.targets = [];
	}

	const targets = data.objective.targets;

	return <EditStep index={ObjectiveDeclarationStep.TARGETS} title={Lang.INDICATOR.OBJECTIVE.TARGETS_TITLE}
	                 backToList={true}>
		{targets.map(target => {
			return null;
		})}
	</EditStep>;
};