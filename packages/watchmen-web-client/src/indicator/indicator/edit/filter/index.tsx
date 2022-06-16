import {IndicatorBaseOn} from '@/services/data/tuples/indicator-types';
import {TopicForIndicator} from '@/services/data/tuples/query-indicator-types';
import {Lang} from '@/widgets/langs';
import React, {useRef} from 'react';
import {EmphaticSinkingLabel, Step, StepBody, StepTitle} from '../../../step-widgets';
import {IndicatorDeclarationStep} from '../../types';
import {Construct, useConstructed} from '../use-constructed';
import {useStep} from '../use-step';
import {TopFilterEdit} from './top-filter-edit';
import {IndicatorFilterContainer} from './widgets';

export const Filter = () => {
	const ref = useRef<HTMLDivElement>(null);
	// const {fire: fireGlobal} = useEventBus();
	// const {fire} = useIndicatorsEventBus();
	const {constructed, setConstructed, visible, setVisible} = useConstructed(ref);
	const {data} = useStep({
		step: IndicatorDeclarationStep.FILTERS,
		active: () => setConstructed(Construct.ACTIVE),
		done: () => setConstructed(Construct.DONE),
		dropped: () => setVisible(false)
	});

	if (constructed === Construct.WAIT) {
		return null;
	}

	let title = '';
	let topic: TopicForIndicator | null = null;
	if (data?.indicator?.baseOn === IndicatorBaseOn.TOPIC) {
		title = Lang.INDICATOR.INDICATOR.FILTERS_ON_TOPIC;
		topic = data?.topic ?? null;
	} else if (data?.indicator?.baseOn === IndicatorBaseOn.SUBJECT) {
		title = Lang.INDICATOR.INDICATOR.FILTERS_ON_SUBJECT;
	}

	return <Step index={IndicatorDeclarationStep.FILTERS} visible={visible} ref={ref}>
		<StepTitle visible={visible}>
			<EmphaticSinkingLabel>
				{title}
			</EmphaticSinkingLabel>
		</StepTitle>
		<StepBody visible={visible}>
			{topic != null
				? <IndicatorFilterContainer>
					<TopFilterEdit indicator={data?.indicator!} topic={topic}/>
				</IndicatorFilterContainer>
				: null}
		</StepBody>
	</Step>;
};