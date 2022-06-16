import {Achievement, AchievementIndicator} from '@/services/data/tuples/achievement-types';
import {IndicatorAggregateArithmetic} from '@/services/data/tuples/indicator-types';
import {noop} from '@/services/utils';
import {CheckBox} from '@/widgets/basic/checkbox';
import {Dropdown} from '@/widgets/basic/dropdown';
import {InputLines} from '@/widgets/basic/input-lines';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {useThrottler} from '@/widgets/throttler';
import {ChangeEvent} from 'react';
import {useAchievementEventBus} from '../../../achievement-event-bus';
import {AchievementEventTypes} from '../../../achievement-event-bus-types';
import {useAchievementEditEventBus} from '../achievement-edit-event-bus';
import {AchievementEditEventTypes} from '../achievement-edit-event-bus-types';
import {IndicatorCalculationFormulaContainer, IndicatorCalculationFormulaLabel} from './widgets';

export const IndicatorCalculationFormula = (props: {
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
	expanded: boolean;
}) => {
	const {achievement, achievementIndicator, expanded} = props;

	const {fire} = useAchievementEventBus();
	const {fire: fireEdit} = useAchievementEditEventBus();
	const saveQueue = useThrottler();
	const forceUpdate = useForceUpdate();

	const onArithmeticChanged = (option: DropdownOption) => {
		const oldValue = achievementIndicator.aggregateArithmetic;
		const newValue = option.value as IndicatorAggregateArithmetic;
		if (oldValue !== newValue) {
			achievementIndicator.aggregateArithmetic = newValue;
			fireEdit(AchievementEditEventTypes.INDICATOR_AGGREGATION_CHANGED, achievement, achievementIndicator);
			fire(AchievementEventTypes.SAVE_ACHIEVEMENT, achievement, noop);
			forceUpdate();
		}
	};
	const onFormulaChanged = (event: ChangeEvent<HTMLTextAreaElement>) => {
		achievementIndicator.formula = event.target.value;
		saveQueue.replace(() => {
			fireEdit(AchievementEditEventTypes.INDICATOR_FORMULA_CHANGED, achievement, achievementIndicator);
			fire(AchievementEventTypes.SAVE_ACHIEVEMENT, achievement, noop);
		}, 300);
		forceUpdate();
	};
	const onIncludeInFinalScoreChanged = (value: boolean) => {
		achievementIndicator.includeInFinalScore = value;
		fireEdit(AchievementEditEventTypes.INDICATOR_SCORE_INCLUDE_CHANGED, achievement, achievementIndicator);
		fire(AchievementEventTypes.SAVE_ACHIEVEMENT, achievement, noop);
		forceUpdate();
	};

	const aggregateArithmeticsOptions = [
		{value: IndicatorAggregateArithmetic.SUM, label: Lang.INDICATOR.INSPECTION.VALUE_TRANSFORM_SUM},
		{value: IndicatorAggregateArithmetic.AVG, label: Lang.INDICATOR.INSPECTION.VALUE_TRANSFORM_AVG},
		{value: IndicatorAggregateArithmetic.COUNT, label: Lang.INDICATOR.INSPECTION.VALUE_TRANSFORM_COUNT}
	];
	const placeholder = `c: value of current period,
p: value of previous period,
r: value of increment.
eg 1: c - p;
eg 2: interpolation(r, -0.2, 5, 0.2, 20)`;

	return <IndicatorCalculationFormulaContainer expanded={expanded}>
		<IndicatorCalculationFormulaLabel>
			{Lang.INDICATOR.ACHIEVEMENT.INDICATOR_AGGREGATE_ARITHMETIC_LABEL}
		</IndicatorCalculationFormulaLabel>
		<Dropdown value={achievementIndicator.aggregateArithmetic ?? IndicatorAggregateArithmetic.SUM}
		          options={aggregateArithmeticsOptions}
		          onChange={onArithmeticChanged}/>
		<IndicatorCalculationFormulaLabel>
			{Lang.INDICATOR.ACHIEVEMENT.INDICATOR_FORMULA_LABEL}
		</IndicatorCalculationFormulaLabel>
		<InputLines value={achievementIndicator.formula ?? ''} onChange={onFormulaChanged}
		            placeholder={placeholder}/>
		<IndicatorCalculationFormulaLabel>
			{Lang.INDICATOR.ACHIEVEMENT.SCORE_INCLUDE_IN_FINAL}
		</IndicatorCalculationFormulaLabel>
		<CheckBox value={achievementIndicator.includeInFinalScore ?? true} onChange={onIncludeInFinalScoreChanged}/>
	</IndicatorCalculationFormulaContainer>;
};