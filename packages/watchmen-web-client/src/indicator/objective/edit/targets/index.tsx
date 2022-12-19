import {Objective, ObjectiveTarget} from '@/services/data/tuples/objective-types';
import {ButtonInk} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import {EditStep} from '../edit-step';
import {ObjectiveDeclarationStep} from '../steps';
import {useSave} from '../use-save';
import {AddItemButton} from '../widgets';
import {Target} from './target';
import {TargetsContainer} from './widgets';

export const Targets = (props: { objective: Objective }) => {
	const {objective} = props;

	const save = useSave();

	if (objective.targets == null) {
		objective.targets = [];
	}

	const onRemove = (target: ObjectiveTarget) => {
		objective.targets!.splice(objective.targets!.indexOf(target), 1);
		save(objective);
	};
	const onAddClicked = () => {
		objective.targets!.push({} as ObjectiveTarget);
		save(objective);
	};

	const targets = objective.targets;

	return <EditStep index={ObjectiveDeclarationStep.TARGETS} title={Lang.INDICATOR.OBJECTIVE.TARGETS_TITLE}
	                 backToList={true}>
		<TargetsContainer>
			{targets.map((target, index) => {
				return <Target objective={objective} target={target} index={index + 1}
				               onRemove={onRemove}
				               key={`${target.name || ''}-${index}`}/>;
			})}
			<AddItemButton ink={ButtonInk.PRIMARY} onClick={onAddClicked}>
				{Lang.INDICATOR.OBJECTIVE.ADD_TARGET}
			</AddItemButton>
		</TargetsContainer>
	</EditStep>;
};
