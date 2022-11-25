import {Router} from '@/routes/types';
import {ButtonInk} from '@/widgets/basic/types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {useNavigate} from 'react-router-dom';
import {EmphaticSinkingLabel, Step, StepTitle, StepTitleButton} from '../../step-widgets';
import {ObjectiveData} from '../objectives-event-bus-types';
import {ObjectiveDeclarationStep} from './steps';
import {BackToListButtonContainer} from './widgets';

export const Targets = (props: { data: ObjectiveData }) => {
	const {data} = props;

	const navigate = useNavigate();
	const {fire: fireGlobal} = useEventBus();

	const onBackToListClicked = () => {
		fireGlobal(EventTypes.SHOW_YES_NO_DIALOG, Lang.INDICATOR.ON_EDIT, () => {
			fireGlobal(EventTypes.HIDE_DIALOG);
			navigate(Router.IDW_OBJECTIVE);
		}, () => fireGlobal(EventTypes.HIDE_DIALOG));
	};

	return <Step index={ObjectiveDeclarationStep.TARGETS}>
		<StepTitle visible={true}>
			<EmphaticSinkingLabel grow={true}>
				{Lang.INDICATOR.OBJECTIVE.TARGETS_TITLE}
			</EmphaticSinkingLabel>
			<BackToListButtonContainer>
				<StepTitleButton ink={ButtonInk.WAIVE} onClick={onBackToListClicked}>
					{Lang.INDICATOR.OBJECTIVE.BACK_TO_LIST}
				</StepTitleButton>
			</BackToListButtonContainer>
		</StepTitle>
	</Step>;
};