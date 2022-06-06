import {BucketId} from '@/services/data/tuples/bucket-types';
import {ComparableTypes} from '@/services/data/tuples/factor-types';
import {Indicator} from '@/services/data/tuples/indicator-types';
import {findTopicAndFactor} from '@/services/data/tuples/indicator-utils';
import {
	Achievement,
	AchievementIndicator,
	AchievementIndicatorCriteria,
	AchievementIndicatorCriteriaOnBucket,
	AchievementIndicatorCriteriaOnExpression,
	AchievementIndicatorCriteriaOperator
} from '@/services/data/tuples/achievement-types';
import {
	isAchievementIndicatorCriteriaOnBucket,
	isAchievementIndicatorCriteriaOnExpression
} from '@/services/data/tuples/achievement-utils';
import {isNotNull} from '@/services/data/utils';
import {noop} from '@/services/utils';
import {Dropdown} from '@/widgets/basic/dropdown';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {useEffect} from 'react';
import {useAchievementEventBus} from '../../../achievement-event-bus';
import {AchievementEventTypes} from '../../../achievement-event-bus-types';
import {useAchievementEditEventBus} from '../achievement-edit-event-bus';
import {AchievementEditEventTypes} from '../achievement-edit-event-bus-types';
import {IndicatorCriteriaDefData} from '../types';
import {CriteriaArithmeticLabel} from '../utils';
import {buildValueBucketOptions, getCriteriaArithmetic, isCriteriaArithmeticVisible} from './utils';
import {IndicatorCriteriaArithmetic} from './widgets';

export const IndicatorCriteriaArithmeticEditor = (props: {
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
	criteria: AchievementIndicatorCriteria;
	defData: IndicatorCriteriaDefData;
	indicator: Indicator;
}) => {
	const {achievement, achievementIndicator, criteria, defData, indicator} = props;

	const {fire} = useAchievementEventBus();
	const {on: onEdit, off: offEdit, fire: fireEdit} = useAchievementEditEventBus();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onCriteriaChanged = (aAchievement: Achievement, aAchievementIndicator: AchievementIndicator, aCriteria: AchievementIndicatorCriteria) => {
			if (aAchievement !== achievement || aAchievementIndicator !== achievementIndicator || aCriteria !== criteria) {
				return;
			}
			forceUpdate();
		};
		onEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_FACTOR_CHANGED, onCriteriaChanged);
		return () => {
			offEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_FACTOR_CHANGED, onCriteriaChanged);
		};
	}, [onEdit, offEdit, forceUpdate, achievement, achievementIndicator, criteria]);

	const onCriteriaArithmeticChanged = (criteria: AchievementIndicatorCriteria) => (option: DropdownOption) => {
		const oldValue = getCriteriaArithmetic(criteria);
		const newValue = option.value as BucketId | AchievementIndicatorCriteriaOperator;
		// eslint-disable-next-line
		if (oldValue == newValue) {
			return;
		}
		switch (newValue) {
			case AchievementIndicatorCriteriaOperator.EQUALS:
			case AchievementIndicatorCriteriaOperator.NOT_EQUALS:
			case AchievementIndicatorCriteriaOperator.LESS:
			case AchievementIndicatorCriteriaOperator.LESS_EQUALS:
			case AchievementIndicatorCriteriaOperator.MORE:
			case AchievementIndicatorCriteriaOperator.MORE_EQUALS:
				if (isAchievementIndicatorCriteriaOnBucket(criteria)) {
					delete criteria.bucketId;
					delete criteria.bucketSegmentName;
				}
				const criteriaOnExp = criteria as AchievementIndicatorCriteriaOnExpression;
				criteriaOnExp.operator = newValue;
				break;
			default:
				if (isAchievementIndicatorCriteriaOnExpression(criteria)) {
					delete criteria.operator;
					delete criteria.value;
					const criteriaOnBucket = criteria as AchievementIndicatorCriteriaOnBucket;
					criteriaOnBucket.bucketId = newValue as BucketId;
					delete criteriaOnBucket.bucketSegmentName;
				} else if (isAchievementIndicatorCriteriaOnBucket(criteria)) {
					// eslint-disable-next-line
					if (criteria.bucketId != newValue as BucketId) {
						criteria.bucketId = newValue as BucketId;
						delete criteria.bucketSegmentName;
					}
				} else {
					(criteria as AchievementIndicatorCriteriaOnBucket).bucketId = newValue as BucketId;
				}
				break;
		}
		fireEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_ARITHMETIC_CHANGED, achievement, achievementIndicator, criteria);
		fireEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_CHANGED, achievement, achievementIndicator);
		fire(AchievementEventTypes.SAVE_ACHIEVEMENT, achievement, noop);
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
	const comparableArithmeticOptions = comparable ? [{
		value: AchievementIndicatorCriteriaOperator.LESS,
		label: CriteriaArithmeticLabel[AchievementIndicatorCriteriaOperator.LESS]
	},
		{
			value: AchievementIndicatorCriteriaOperator.LESS_EQUALS,
			label: CriteriaArithmeticLabel[AchievementIndicatorCriteriaOperator.LESS_EQUALS]
		},
		{
			value: AchievementIndicatorCriteriaOperator.MORE,
			label: CriteriaArithmeticLabel[AchievementIndicatorCriteriaOperator.MORE]
		},
		{
			value: AchievementIndicatorCriteriaOperator.MORE_EQUALS,
			label: CriteriaArithmeticLabel[AchievementIndicatorCriteriaOperator.MORE_EQUALS]
		}] : [];

	const arithmeticOptions = [
		...buildValueBucketOptions(criteria, indicator, defData),
		{
			value: AchievementIndicatorCriteriaOperator.EQUALS,
			label: CriteriaArithmeticLabel[AchievementIndicatorCriteriaOperator.EQUALS]
		},
		{
			value: AchievementIndicatorCriteriaOperator.NOT_EQUALS,
			label: CriteriaArithmeticLabel[AchievementIndicatorCriteriaOperator.NOT_EQUALS]
		},
		...comparableArithmeticOptions
	].filter(isNotNull);

	return <IndicatorCriteriaArithmetic>
		{isCriteriaArithmeticVisible(criteria)
			? <Dropdown value={getCriteriaArithmetic(criteria)} options={arithmeticOptions}
			            onChange={onCriteriaArithmeticChanged(criteria)}
			            please={Lang.INDICATOR.ACHIEVEMENT.PLEASE_SELECT_CRITERIA_OPERATOR}/>
			: null}
	</IndicatorCriteriaArithmetic>;
};