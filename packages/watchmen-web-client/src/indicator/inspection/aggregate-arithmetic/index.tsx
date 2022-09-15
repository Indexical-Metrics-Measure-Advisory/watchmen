import {IndicatorAggregateArithmetic} from '@/services/data/tuples/indicator-types';
import {Lang} from '@/widgets/langs';
import {useVisibleOnII} from '../use-visible-on-ii';
import {AggregateArithmeticLabel} from '../utils';
import {InspectionLabel} from '../widgets';
import {ValueTransformButton, ValueTransformContainer} from './widgets';

export const AggregateArithmetic = () => {
	// const {fire} = useInspectionEventBus();
	const {visible, inspection, indicator} = useVisibleOnII();
	// const forceUpdate = useForceUpdate();

	if (!visible) {
		return null;
	}

	// const onArithmeticClicked = (arithmetic: IndicatorAggregateArithmetic) => () => {
	// 	if (inspection!.aggregateArithmetics == null) {
	// 		inspection!.aggregateArithmetics = [];
	// 	}
	// 	if (inspection!.aggregateArithmetics.includes(arithmetic)) {
	// 		inspection!.aggregateArithmetics = inspection!.aggregateArithmetics.filter(existing => existing !== arithmetic);
	// 	} else {
	// 		inspection!.aggregateArithmetics.push(arithmetic);
	// 	}
	// 	fire(InspectionEventTypes.AGGREGATE_ARITHMETIC_CHANGED, inspection!);
	// 	forceUpdate();
	// };

	const arithmetics = (indicator?.indicator.factorId == null)
		? [IndicatorAggregateArithmetic.COUNT]
		: Object.values(IndicatorAggregateArithmetic);
	const selectedArithmetics = (() => {
		if (arithmetics.length === 0) {
			return [IndicatorAggregateArithmetic.COUNT];
		} else {
			return (inspection?.aggregateArithmetics || []).length !== 0 ? (inspection?.aggregateArithmetics ?? []) : [IndicatorAggregateArithmetic.SUM];
		}
	})();

	return <ValueTransformContainer>
		<InspectionLabel>{Lang.INDICATOR.INSPECTION.VALUE_TRANSFORM_LABEL}</InspectionLabel>
		{arithmetics.map(arithmetic => {
			const selected = selectedArithmetics.includes(arithmetic);
			if (!selected) {
				return null;
			}
			return <ValueTransformButton key={arithmetic}>
				{/*ink={selected ? ButtonInk.SUCCESS : ButtonInk.WAIVE}*/}
				{/*onClick={onArithmeticClicked(arithmetic)}*/}
				{AggregateArithmeticLabel[arithmetic]}
			</ValueTransformButton>;
		})}
	</ValueTransformContainer>;
};