import {IndicatorAggregateArithmetic} from '@/services/data/tuples/indicator-types';
import {AggregateItem, AggregateItemsBlock, AggregateItemsTitle} from './widgets';

export const AggregateItems = (props: { label: string; aggregates: Array<IndicatorAggregateArithmetic> }) => {
	const {label, aggregates} = props;

	if (aggregates.length === 0) {
		return null;
	}

	return <>
		<AggregateItemsTitle>{label}</AggregateItemsTitle>
		<AggregateItemsBlock>
			{aggregates.map(aggregate => {
				return <AggregateItem key={aggregate}>
					{aggregate.replace(/-/g, ' ')}
				</AggregateItem>;
			})}
		</AggregateItemsBlock>
	</>;
};