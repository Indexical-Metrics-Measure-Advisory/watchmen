import {Indicator, IndicatorAggregateArithmetic} from '@/services/data/tuples/indicator-types';
import {noop} from '@/services/utils';
import {ICON_CHECK} from '@/widgets/basic/constants';
import {useForceUpdate} from '@/widgets/basic/utils';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useIndicatorsEventBus} from '../../indicators-event-bus';
import {IndicatorsEventTypes} from '../../indicators-event-bus-types';
import {AggregateItem, AggregateItemsBlock} from './widgets';

export const AggregateItems = (props: { indicator: Indicator, aggregates: Array<IndicatorAggregateArithmetic> }) => {
	const {indicator, aggregates} = props;

	const {fire: fireIndicator} = useIndicatorsEventBus();
	const forceUpdate = useForceUpdate();

	if (aggregates.length === 0) {
		return null;
	}

	const onArithmeticClicked = (aggregate: IndicatorAggregateArithmetic) => () => {
		if (aggregate === indicator.arithmetic) {
			return;
		}
		indicator.arithmetic = aggregate;
		fireIndicator(IndicatorsEventTypes.SAVE_INDICATOR, indicator, noop);
		forceUpdate();
	};

	const arithmetic = indicator.arithmetic ?? (indicator.factorId == null ? IndicatorAggregateArithmetic.COUNT : IndicatorAggregateArithmetic.SUM);

	return <AggregateItemsBlock>
		{aggregates.map(aggregate => {
			return <AggregateItem onClick={onArithmeticClicked(aggregate)} key={aggregate}>
				<span>{aggregate.replace(/-/g, ' ')}</span>
				{arithmetic === aggregate ? <FontAwesomeIcon icon={ICON_CHECK}/> : null}
			</AggregateItem>;
		})}
	</AggregateItemsBlock>;
};