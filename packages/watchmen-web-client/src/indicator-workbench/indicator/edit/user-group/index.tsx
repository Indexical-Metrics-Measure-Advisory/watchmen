import {useEventBus} from '@/widgets/events/event-bus';
import {Lang} from '@/widgets/langs';
import {useRef} from 'react';
import {EmphaticSinkingLabel, Step, StepBody, StepTitle} from '../../../step-widgets';
import {useIndicatorsEventBus} from '../../indicators-event-bus';
import {IndicatorDeclarationStep} from '../../types';
import {Construct, useConstructed} from '../use-constructed';
import {useStep} from '../use-step';

export const UserGroupAssigner = () => {
	const ref = useRef<HTMLDivElement>(null);
	const {fire: fireGlobal} = useEventBus();
	const {fire} = useIndicatorsEventBus();
	const {constructed, setConstructed, visible, setVisible} = useConstructed(ref);
	const {data, done} = useStep({
		step: IndicatorDeclarationStep.USER_GROUPS,
		active: () => setConstructed(Construct.ACTIVE),
		done: () => setConstructed(Construct.DONE),
		dropped: () => setVisible(false)
	});

	if (constructed === Construct.WAIT) {
		return null;
	}

	return <Step index={IndicatorDeclarationStep.USER_GROUPS} visible={visible} ref={ref}>
		<StepTitle visible={visible}>
			<EmphaticSinkingLabel>
				{Lang.INDICATOR_WORKBENCH.INDICATOR.USER_GROUP}
			</EmphaticSinkingLabel>
		</StepTitle>
		<StepBody visible={visible}>
		</StepBody>
	</Step>;
};