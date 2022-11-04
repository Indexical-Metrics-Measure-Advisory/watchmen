import {Router} from '@/routes/types';
import {ButtonInk} from '@/widgets/basic/types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {useRef} from 'react';
import {useNavigate} from 'react-router-dom';
import {
	EmphaticSinkingLabel,
	Step,
	StepBody,
	StepBodyButtons,
	StepBodyConjunctionLabel,
	StepTitle,
	StepTitleButton
} from '../../../step-widgets';
import {useIndicatorsEventBus} from '../../indicators-event-bus';
import {IndicatorsEventTypes} from '../../indicators-event-bus-types';
import {IndicatorDeclarationStep} from '../../types';
import {Construct, useConstructed} from '../use-constructed';
import {useStep} from '../use-step';

export const LastStep = () => {
	const navigate = useNavigate();
	const ref = useRef<HTMLDivElement>(null);
	const {fire: fireGlobal} = useEventBus();
	const {fire} = useIndicatorsEventBus();
	const {constructed, setConstructed, visible, setVisible} = useConstructed(ref, true);
	useStep({
		step: IndicatorDeclarationStep.LAST_STEP,
		active: () => setConstructed(Construct.ACTIVE),
		done: () => setConstructed(Construct.DONE),
		dropped: () => setVisible(false)
	});

	if (constructed === Construct.WAIT) {
		return null;
	}

	const onRestartClicked = () => {
		fire(IndicatorsEventTypes.SWITCH_STEP, IndicatorDeclarationStep.CREATE_OR_FIND);
	};
	const onBackToListClicked = () => {
		fireGlobal(EventTypes.SHOW_YES_NO_DIALOG,
			Lang.INDICATOR.ON_EDIT,
			() => {
				fireGlobal(EventTypes.HIDE_DIALOG);
				navigate(Router.IDW_INDICATOR);
			}, () => fireGlobal(EventTypes.HIDE_DIALOG));
	};

	return <Step index={IndicatorDeclarationStep.LAST_STEP} visible={visible} ref={ref}>
		<StepTitle visible={visible}>
			<EmphaticSinkingLabel>
				{Lang.INDICATOR.INDICATOR.LAST_STEP_TITLE}
			</EmphaticSinkingLabel>
		</StepTitle>
		<StepBody visible={visible}>
			<StepBodyButtons>
				<StepTitleButton ink={ButtonInk.DANGER} onClick={onRestartClicked}>
					{Lang.INDICATOR.INDICATOR.PREPARE_ANOTHER}
				</StepTitleButton>
				<StepBodyConjunctionLabel>{Lang.INDICATOR.INDICATOR.OR}</StepBodyConjunctionLabel>
				<StepTitleButton ink={ButtonInk.WAIVE} onClick={onBackToListClicked}>
					{Lang.INDICATOR.INDICATOR.BACK_TO_LIST}
				</StepTitleButton>
			</StepBodyButtons>
		</StepBody>
	</Step>;
};