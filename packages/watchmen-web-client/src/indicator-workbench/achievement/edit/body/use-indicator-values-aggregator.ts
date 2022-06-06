import {Achievement, AchievementIndicator} from '@/services/data/tuples/achievement-types';
import {useEffect, useState} from 'react';
import {useAchievementEditEventBus} from './achievement-edit-event-bus';
import {AchievementEditEventTypes} from './achievement-edit-event-bus-types';
import {
	AllCalculatedIndicatorValues,
	AllCalculatedIndicatorValuesData,
	AllIndicatedValuesCalculationResult,
	CalculatedIndicatorValues,
	AchievementIndicatorCalculatedValues
} from './types';

const needApplyComputed = (computed: AllIndicatedValuesCalculationResult, current: AllCalculatedIndicatorValues) => {
	if (!current.calculated) {
		return true;
	}

	const {failed, failureReason, shouldComputeScore, score} = computed;

	// eslint-disable-next-line
	return current.failed != failed
		// eslint-disable-next-line
		|| current.failureReason != failureReason
		// eslint-disable-next-line
		|| current.shouldComputeScore != shouldComputeScore
		// eslint-disable-next-line
		|| current.score?.value != score?.value;
};

/**
 * for handle changes of indicators values,
 * 1. root node
 * 2. compute indicator
 */
export const useIndicatorValuesAggregator = (options: {
	achievement: Achievement;
	/**
	 * {@link AchievementEditEventTypes#INDICATOR_REMOVED},
	 * {@link AchievementEditEventTypes#VALUES_CALCULATED}
	 */
	shouldAvoidIndicatorRemovedAndValuesCalculated: (achievement: Achievement, achievementIndicator: AchievementIndicator) => boolean;
	/**
	 * {@link AchievementEditEventTypes#INDICATOR_FORMULA_CHANGED}
	 */
	shouldAvoidFormulaChanged: (achievement: Achievement, achievementIndicator: AchievementIndicator) => boolean;
	/**
	 * {@link AchievementEditEventTypes#INDICATOR_SCORE_INCLUDE_CHANGED}
	 */
	shouldAvoidScoreIncludeChanged: (achievement: Achievement, achievementIndicator: AchievementIndicator) => boolean;
	compute: (data: AllCalculatedIndicatorValuesData) => AllIndicatedValuesCalculationResult;
	onComputed: (result: AllIndicatedValuesCalculationResult) => void;
	shouldAvoidButterflyEffect: boolean;
}) => {
	const {
		achievement,
		shouldAvoidIndicatorRemovedAndValuesCalculated, shouldAvoidFormulaChanged, shouldAvoidScoreIncludeChanged,
		compute, onComputed, shouldAvoidButterflyEffect
	} = options;

	const {on, off, fire} = useAchievementEditEventBus();
	const [allValues] = useState<AllCalculatedIndicatorValues>({
		data: [],
		calculated: false,
		failed: false,
		shouldComputeScore: false
	});
	useEffect(() => {
		const defendAchievement = (achievement: Achievement, achievementIndicator: AchievementIndicator, func: () => void) => {
			if (shouldAvoidIndicatorRemovedAndValuesCalculated(achievement, achievementIndicator)) {
				return;
			}
			func();
		};
		const applyComputed = (computed: AllIndicatedValuesCalculationResult) => {
			const {failed, failureReason, shouldComputeScore, score} = computed;
			allValues.calculated = true;
			allValues.failed = failed;
			allValues.failureReason = failureReason;
			allValues.shouldComputeScore = shouldComputeScore;
			allValues.score = score;
			onComputed({failed, failureReason, shouldComputeScore, score});
		};
		const doCalculate = () => {
			const computed = compute(allValues.data);
			if (shouldAvoidButterflyEffect) {
				if (needApplyComputed(computed, allValues)) {
					// only applied when need to
					// value change guard is obligatory, since in following scenario will cause an infinite recursion.
					// e.g. there are 2 aggregators, typically 2 compute indicators
					// 1. when aggregator A is computed, fires a {@link AchievementEditEventTypes.VALUES_CALCULATED} event,
					// 2. aggregator B will capture the event, and do calculation,
					//    and fire a {@link AchievementEditEventTypes.VALUES_CALCULATED} event,
					// 3. aggregator A will capture the event from step #1 and #2, event from #1 is ignored,
					//    but event from #2 is consumed (which is already done in step 1).
					//    therefore, a {@link AchievementEditEventTypes.VALUES_CALCULATED} event will be fired again,
					//    and step 2 will be triggerred again ,
					// so stack overflows.
					applyComputed(computed);
				}
			} else {
				// always apply computed
				applyComputed(computed);
			}
		};
		const calculate = () => {
			if (allValues.data.length === 0 && (achievement.indicators || []).length > 1) {
				(async () => {
					allValues.data = await Promise.all(
						(achievement.indicators || [])
							.filter(indicator => !shouldAvoidIndicatorRemovedAndValuesCalculated(achievement, indicator))
							.map(indicator => {
								return new Promise<AchievementIndicatorCalculatedValues>(resolve => {
									fire(AchievementEditEventTypes.ASK_CALCULATED_VALUES, achievement, indicator, (values: CalculatedIndicatorValues) => {
										resolve({indicator, values});
									});
								});
							})
					);
					doCalculate();
				})();
			} else {
				doCalculate();
			}
		};
		const onIndicatorRemoved = (aAchievement: Achievement, achievementIndicator: AchievementIndicator) => {
			defendAchievement(aAchievement, achievementIndicator, () => {
				const index = allValues.data.findIndex(({indicator}) => indicator === achievementIndicator);
				if (index !== -1) {
					allValues.data.splice(index, 1);
				}
				calculate();
			});
		};
		const onValuesCalculated = (aAchievement: Achievement, achievementIndicator: AchievementIndicator, values: CalculatedIndicatorValues) => {
			defendAchievement(aAchievement, achievementIndicator, () => {
				const pair = allValues.data.find(({indicator}) => indicator === achievementIndicator);
				if (pair == null) {
					allValues.data.push({indicator: achievementIndicator, values});
				} else {
					pair.values = values;
				}
				calculate();
			});
		};
		const onFormulaChanged = (aAchievement: Achievement, aAchievementIndicator: AchievementIndicator) => {
			if (shouldAvoidFormulaChanged(aAchievement, aAchievementIndicator)) {
				return;
			}
			calculate();
		};
		const onScoreIncludeChanged = (aAchievement: Achievement, aAchievementIndicator: AchievementIndicator) => {
			if (shouldAvoidScoreIncludeChanged(aAchievement, aAchievementIndicator)) {
				return;
			}
			calculate();
		};
		on(AchievementEditEventTypes.INDICATOR_REMOVED, onIndicatorRemoved);
		on(AchievementEditEventTypes.VALUES_CALCULATED, onValuesCalculated);
		on(AchievementEditEventTypes.INDICATOR_FORMULA_CHANGED, onFormulaChanged);
		on(AchievementEditEventTypes.INDICATOR_SCORE_INCLUDE_CHANGED, onScoreIncludeChanged);
		return () => {
			off(AchievementEditEventTypes.INDICATOR_REMOVED, onIndicatorRemoved);
			off(AchievementEditEventTypes.VALUES_CALCULATED, onValuesCalculated);
			off(AchievementEditEventTypes.INDICATOR_FORMULA_CHANGED, onFormulaChanged);
			off(AchievementEditEventTypes.INDICATOR_SCORE_INCLUDE_CHANGED, onScoreIncludeChanged);
		};
	}, [
		on, off, fire,
		achievement, allValues,
		shouldAvoidIndicatorRemovedAndValuesCalculated, shouldAvoidFormulaChanged, shouldAvoidScoreIncludeChanged,
		compute, onComputed, shouldAvoidButterflyEffect
	]);

	return allValues;
};