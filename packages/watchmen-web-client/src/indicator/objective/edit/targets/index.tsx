import {Objective, ObjectiveTarget} from '@/services/data/tuples/objective-types';
import {generateUuid} from '@/services/data/tuples/utils';
import {noop} from '@/services/utils';
import {ButtonInk} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';
import {EditStep} from '../edit-step';
import {ObjectiveDeclarationStep} from '../steps';
import {AddItemButton} from '../widgets';
import {Target} from './target';
import {TargetsContainer} from './widgets';

export const Targets = (props: { objective: Objective }) => {
	const {objective} = props;

	const {fire} = useObjectivesEventBus();
	const forceUpdate = useForceUpdate();

	if (objective.targets == null) {
		objective.targets = [];
	}

	const onRemove = (target: ObjectiveTarget) => {
		objective.targets!.splice(objective.targets!.indexOf(target), 1);
		fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		forceUpdate();
	};
	const onAddClicked = () => {
		let uuid = generateUuid();
		// eslint-disable-next-line
		while ((objective.targets || []).some(target => target.uuid === uuid)) {
			uuid = generateUuid();
		}
		objective.targets!.push({uuid} as ObjectiveTarget);
		fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		forceUpdate();
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
