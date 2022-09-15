import {IndicatorAggregateArithmetic} from '@/services/data/tuples/indicator-types';
import {Lang} from '@/widgets/langs';
import {useRef} from 'react';
import {EmphaticSinkingLabel, Step, StepBody, StepTitle} from '../../../step-widgets';
import {IndicatorDeclarationStep} from '../../types';
import {Construct, useConstructed} from '../use-constructed';
import {useStep} from '../use-step';
import {AggregateItems} from './aggregate-items';
import {AggregateItemContainer} from './widgets';

export const AggregateItem = () => {
	const ref = useRef<HTMLDivElement>(null);
	const {constructed, setConstructed, visible, setVisible} = useConstructed(ref);
	const {data} = useStep({
		step: IndicatorDeclarationStep.AGGREGATE_ITEM,
		active: () => setConstructed(Construct.ACTIVE),
		done: () => setConstructed(Construct.DONE),
		dropped: () => setVisible(false)
	});

	if (constructed === Construct.WAIT) {
		return null;
	}

	const aggregates = data?.indicator?.factorId == null
		? [IndicatorAggregateArithmetic.COUNT]
		: [IndicatorAggregateArithmetic.COUNT, IndicatorAggregateArithmetic.SUM, IndicatorAggregateArithmetic.AVG,
			IndicatorAggregateArithmetic.MAX, IndicatorAggregateArithmetic.MIN];

	return <Step index={IndicatorDeclarationStep.AGGREGATE_ITEM} visible={visible} ref={ref}>
		<StepTitle visible={visible}>
			<EmphaticSinkingLabel>{Lang.INDICATOR.INDICATOR.AGGREGATE_ITEM_TITLE}</EmphaticSinkingLabel>
		</StepTitle>
		<StepBody visible={visible}>
			<AggregateItemContainer>
				<AggregateItems indicator={data?.indicator!} aggregates={aggregates}/>
			</AggregateItemContainer>
		</StepBody>
	</Step>;
};