import {BucketId} from '@/services/data/tuples/bucket-types';
import {ComparableTypes} from '@/services/data/tuples/factor-types';
import {
	IndicatorCriteria,
	IndicatorCriteriaOnBucket,
	IndicatorCriteriaOnExpression,
	IndicatorCriteriaOperator
} from '@/services/data/tuples/indicator-criteria-types';
import {
	getCriteriaArithmetic,
	isIndicatorCriteriaOnBucket,
	isIndicatorCriteriaOnExpression,
	isCriteriaArithmeticVisible
} from '@/services/data/tuples/indicator-criteria-utils';
import {Indicator} from '@/services/data/tuples/indicator-types';
import {findTopicAndFactor} from '@/services/data/tuples/indicator-utils';
import {Inspection} from '@/services/data/tuples/inspection-types';
import {isNotNull} from '@/services/data/utils';
import {noop} from '@/services/utils';
import {Dropdown} from '@/widgets/basic/dropdown';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {useEffect} from 'react';
import {useInspectionEventBus} from '../inspection-event-bus';
import {InspectionEventTypes} from '../inspection-event-bus-types';
import {IndicatorCriteriaDefData} from './types';
import {buildValueBucketOptions, CriteriaArithmeticLabel} from './utils';
import {InspectionCriteriaArithmetic} from './widgets';

export const CriteriaArithmeticEditor = (props: {
	inspection: Inspection;
	criteria: IndicatorCriteria;
	defData: IndicatorCriteriaDefData;
	indicator: Indicator;
}) => {
	const {inspection, criteria, defData, indicator} = props;

	const {on, off, fire} = useInspectionEventBus();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onCriteriaChanged = (anInspection: Inspection, aCriteria: IndicatorCriteria) => {
			if (anInspection !== inspection || aCriteria !== criteria) {
				return;
			}
			forceUpdate();
		};
		on(InspectionEventTypes.INDICATOR_CRITERIA_FACTOR_CHANGED, onCriteriaChanged);
		return () => {
			off(InspectionEventTypes.INDICATOR_CRITERIA_FACTOR_CHANGED, onCriteriaChanged);
		};
	}, [on, off, forceUpdate, inspection, criteria]);

	const onCriteriaArithmeticChanged = (criteria: IndicatorCriteria) => (option: DropdownOption) => {
		const oldValue = getCriteriaArithmetic(criteria);
		const newValue = option.value as BucketId | IndicatorCriteriaOperator;
		// eslint-disable-next-line
		if (oldValue == newValue) {
			return;
		}
		switch (newValue) {
			case IndicatorCriteriaOperator.EQUALS:
			case IndicatorCriteriaOperator.NOT_EQUALS:
			case IndicatorCriteriaOperator.LESS:
			case IndicatorCriteriaOperator.LESS_EQUALS:
			case IndicatorCriteriaOperator.MORE:
			case IndicatorCriteriaOperator.MORE_EQUALS:
				if (isIndicatorCriteriaOnBucket(criteria)) {
					delete criteria.bucketId;
					delete criteria.bucketSegmentName;
				}
				const criteriaOnExp = criteria as IndicatorCriteriaOnExpression;
				criteriaOnExp.operator = newValue;
				break;
			default:
				if (isIndicatorCriteriaOnExpression(criteria)) {
					delete criteria.operator;
					delete criteria.value;
					const criteriaOnBucket = criteria as IndicatorCriteriaOnBucket;
					criteriaOnBucket.bucketId = newValue as BucketId;
					delete criteriaOnBucket.bucketSegmentName;
				} else if (isIndicatorCriteriaOnBucket(criteria)) {
					// eslint-disable-next-line
					if (criteria.bucketId != newValue as BucketId) {
						criteria.bucketId = newValue as BucketId;
						delete criteria.bucketSegmentName;
					}
				} else {
					(criteria as IndicatorCriteriaOnBucket).bucketId = newValue as BucketId;
				}
				break;
		}
		fire(InspectionEventTypes.INDICATOR_CRITERIA_ARITHMETIC_CHANGED, inspection, criteria);
		fire(InspectionEventTypes.INDICATOR_CRITERIA_CHANGED, inspection, criteria);
		fire(InspectionEventTypes.SAVE_INSPECTION, inspection, noop);
		forceUpdate();
	};

	const comparable = (() => {
		if (defData.topic != null) {
			// eslint-disable-next-line
			const factor = (defData.topic?.factors || []).find(factor => factor.factorId == criteria.factorId);
			return factor == null || ComparableTypes.includes(factor.type);
		} else if (defData.subject != null) {
			// eslint-disable-next-line
			const column = (defData.subject.dataset.columns || []).find(column => column.columnId == criteria.factorId);
			if (column == null) {
				return true;
			}

			const {factor} = findTopicAndFactor(column, defData.subject);
			return factor == null || ComparableTypes.includes(factor.type);
		} else {
			return true;
		}
	})();
	const comparableArithmeticOptions = comparable ? [
		{
			value: IndicatorCriteriaOperator.LESS,
			label: CriteriaArithmeticLabel[IndicatorCriteriaOperator.LESS]
		},
		{
			value: IndicatorCriteriaOperator.LESS_EQUALS,
			label: CriteriaArithmeticLabel[IndicatorCriteriaOperator.LESS_EQUALS]
		},
		{
			value: IndicatorCriteriaOperator.MORE,
			label: CriteriaArithmeticLabel[IndicatorCriteriaOperator.MORE]
		},
		{
			value: IndicatorCriteriaOperator.MORE_EQUALS,
			label: CriteriaArithmeticLabel[IndicatorCriteriaOperator.MORE_EQUALS]
		}
	] : [];

	const arithmeticOptions = [
		...buildValueBucketOptions(criteria, indicator, defData),
		{
			value: IndicatorCriteriaOperator.EQUALS,
			label: CriteriaArithmeticLabel[IndicatorCriteriaOperator.EQUALS]
		},
		{
			value: IndicatorCriteriaOperator.NOT_EQUALS,
			label: CriteriaArithmeticLabel[IndicatorCriteriaOperator.NOT_EQUALS]
		},
		...comparableArithmeticOptions
	].filter(isNotNull);

	return <InspectionCriteriaArithmetic>
		{isCriteriaArithmeticVisible(criteria)
			? <Dropdown value={getCriteriaArithmetic(criteria)} options={arithmeticOptions}
			            onChange={onCriteriaArithmeticChanged(criteria)}
			            please={Lang.INDICATOR.INSPECTION.PLEASE_SELECT_CRITERIA_OPERATOR}/>
			: null}
	</InspectionCriteriaArithmetic>;
};