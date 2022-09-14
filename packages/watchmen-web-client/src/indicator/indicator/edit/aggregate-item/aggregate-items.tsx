import {IndicatorAggregateArithmetic} from '@/services/data/tuples/indicator-types';
import {AggregateItem, AggregateItemsBlock} from './widgets';

export const AggregateItems = (props: { aggregates: Array<IndicatorAggregateArithmetic> }) => {
	const {aggregates} = props;

	if (aggregates.length === 0) {
		return null;
	}

	return <AggregateItemsBlock>
		{aggregates.map(aggregate => {
			return <AggregateItem key={aggregate}>
				{aggregate.replace(/-/g, ' ')}
			</AggregateItem>;
		})}
	</AggregateItemsBlock>;
};