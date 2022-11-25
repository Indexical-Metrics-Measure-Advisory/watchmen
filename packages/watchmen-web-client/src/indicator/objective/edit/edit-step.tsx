import {ObjectiveDeclarationStep} from '@/indicator/objective/edit/steps';
import {BackToListButtonContainer} from '@/indicator/objective/edit/widgets';
import {EmphaticSinkingLabel, Step, StepTitle, StepTitleButton} from '@/indicator/step-widgets';
import {Router} from '@/routes/types';
import {ButtonInk} from '@/widgets/basic/types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {ReactNode} from 'react';
import {useNavigate} from 'react-router-dom';

export const EditStep = (props: {
	index: ObjectiveDeclarationStep;
	title: string;
	backToList?: boolean;
	children?: ReactNode;
}) => {
	const {index, title, backToList = false, children} = props;

	const navigate = useNavigate();
	const {fire: fireGlobal} = useEventBus();

	const onBackToListClicked = () => {
		fireGlobal(EventTypes.SHOW_YES_NO_DIALOG, Lang.INDICATOR.ON_EDIT, () => {
			fireGlobal(EventTypes.HIDE_DIALOG);
			navigate(Router.IDW_OBJECTIVE);
		}, () => fireGlobal(EventTypes.HIDE_DIALOG));
	};

	return <Step index={index}>
		<StepTitle visible={true}>
			<EmphaticSinkingLabel grow={true}>{title}</EmphaticSinkingLabel>
			{backToList
				? <BackToListButtonContainer>
					<StepTitleButton ink={ButtonInk.WAIVE} onClick={onBackToListClicked}>
						{Lang.INDICATOR.OBJECTIVE.BACK_TO_LIST}
					</StepTitleButton>
				</BackToListButtonContainer>
				: null}
		</StepTitle>
		{children}
	</Step>;
};