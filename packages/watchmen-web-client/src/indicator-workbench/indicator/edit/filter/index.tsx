import {useStep} from '@/indicator-workbench/indicator/edit/use-step';
import {IndicatorBaseOn} from '@/services/data/tuples/indicator-types';
import {useEventBus} from '@/widgets/events/event-bus';
import {Lang} from '@/widgets/langs';
import {useRef} from 'react';
import {EmphaticSinkingLabel, Step, StepBody, StepTitle} from '../../../step-widgets';
import {useIndicatorsEventBus} from '../../indicators-event-bus';
import {IndicatorDeclarationStep} from '../../types';
import {Construct, useConstructed} from '../use-constructed';

export const Filter = () => {
	const ref = useRef<HTMLDivElement>(null);
	const {fire: fireGlobal} = useEventBus();
	const {fire} = useIndicatorsEventBus();
	const {constructed, setConstructed, visible, setVisible} = useConstructed(ref);
	const {data, done} = useStep({
		step: IndicatorDeclarationStep.FILTERS,
		active: () => setConstructed(Construct.ACTIVE),
		done: () => setConstructed(Construct.DONE),
		dropped: () => setVisible(false)
	});

	if (constructed === Construct.WAIT) {
		return null;
	}

	let title = '';
	if (data?.indicator?.baseOn == IndicatorBaseOn.TOPIC) {
		title = Lang.INDICATOR_WORKBENCH.INDICATOR.FILTERS_ON_TOPIC;
	} else if (data?.indicator?.baseOn == IndicatorBaseOn.SUBJECT) {
		title = Lang.INDICATOR_WORKBENCH.INDICATOR.FILTERS_ON_SUBJECT;
	}

	return <Step index={IndicatorDeclarationStep.FILTERS} visible={visible} ref={ref}>
		<StepTitle visible={visible}>
			<EmphaticSinkingLabel>
				{title}
			</EmphaticSinkingLabel>
		</StepTitle>
		<StepBody visible={visible}>
		</StepBody>
	</Step>;
};