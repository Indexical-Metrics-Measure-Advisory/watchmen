import {Indicator} from '@/services/data/tuples/indicator-types';
import {Achievement, AchievementIndicator, AchievementIndicatorCriteria} from '@/services/data/tuples/achievement-types';
import {CalculatedIndicatorValues, IndicatorValues} from './types';

export enum AchievementEditEventTypes {
	REPAINT = 'repaint',
	EXPAND_NAME = 'expand-name',
	NAME_EXPANDED = 'name-expanded',
	EXPAND_CRITERIA = 'expand-criteria',
	CRITERIA_EXPANDED = 'criteria-expanded',
	EXPAND_CALCULATION = 'expand-calculation',
	CALCULATION_EXPANDED = 'calculation-expanded',

	TIME_RANGE_CHANGED = 'time-range-changed',

	INDICATOR_ADDED = 'indicator-added',
	COMPUTE_INDICATOR_ADDED = 'compute-indicator-added',
	INDICATOR_REMOVED = 'indicator-removed',
	INDICATOR_NAME_CHANGED = 'indicator-name-changed',

	INDICATOR_CRITERIA_ADDED = 'indicator-criteria-added',
	INDICATOR_CRITERIA_CHANGED = 'indicator-criteria-changed',
	INDICATOR_CRITERIA_FACTOR_CHANGED = 'indicator-criteria-factor-changed',
	INDICATOR_CRITERIA_ARITHMETIC_CHANGED = 'indicator-criteria-arithmetic-changed',
	INDICATOR_CRITERIA_REMOVED = 'indicator-criteria-removed',
	INDICATOR_AGGREGATION_CHANGED = 'indicator-aggregation-changed',
	INDICATOR_FORMULA_CHANGED = 'indicator-formula-changed',
	INDICATOR_SCORE_INCLUDE_CHANGED = 'indicator-score-included-changed',

	VALUES_CHANGED = 'values-changed',
	VALUES_CALCULATED = 'values-calculated',
	ASK_CALCULATED_VALUES = 'ask-calculated-values'
}

export interface AchievementEditEventBus {
	fire(type: AchievementEditEventTypes.REPAINT): this;
	on(type: AchievementEditEventTypes.REPAINT, listener: () => void): this;
	off(type: AchievementEditEventTypes.REPAINT, listener: () => void): this;

	fire(type: AchievementEditEventTypes.EXPAND_NAME, achievement: Achievement, achievementIndicator: AchievementIndicator): this;
	on(type: AchievementEditEventTypes.EXPAND_NAME, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator) => void): this;
	off(type: AchievementEditEventTypes.EXPAND_NAME, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator) => void): this;

	fire(type: AchievementEditEventTypes.NAME_EXPANDED, achievement: Achievement, achievementIndicator: AchievementIndicator): this;
	on(type: AchievementEditEventTypes.NAME_EXPANDED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator) => void): this;
	off(type: AchievementEditEventTypes.NAME_EXPANDED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator) => void): this;

	fire(type: AchievementEditEventTypes.EXPAND_CRITERIA, achievement: Achievement, achievementIndicator: AchievementIndicator): this;
	on(type: AchievementEditEventTypes.EXPAND_CRITERIA, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator) => void): this;
	off(type: AchievementEditEventTypes.EXPAND_CRITERIA, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator) => void): this;

	fire(type: AchievementEditEventTypes.CRITERIA_EXPANDED, achievement: Achievement, achievementIndicator: AchievementIndicator): this;
	on(type: AchievementEditEventTypes.CRITERIA_EXPANDED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator) => void): this;
	off(type: AchievementEditEventTypes.CRITERIA_EXPANDED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator) => void): this;

	fire(type: AchievementEditEventTypes.EXPAND_CALCULATION, achievement: Achievement, achievementIndicator: AchievementIndicator): this;
	on(type: AchievementEditEventTypes.EXPAND_CALCULATION, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator) => void): this;
	off(type: AchievementEditEventTypes.EXPAND_CALCULATION, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator) => void): this;

	fire(type: AchievementEditEventTypes.CALCULATION_EXPANDED, achievement: Achievement, achievementIndicator: AchievementIndicator): this;
	on(type: AchievementEditEventTypes.CALCULATION_EXPANDED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator) => void): this;
	off(type: AchievementEditEventTypes.CALCULATION_EXPANDED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator) => void): this;

	fire(type: AchievementEditEventTypes.TIME_RANGE_CHANGED, achievement: Achievement): this;
	on(type: AchievementEditEventTypes.TIME_RANGE_CHANGED, listener: (achievement: Achievement) => void): this;
	off(type: AchievementEditEventTypes.TIME_RANGE_CHANGED, listener: (achievement: Achievement) => void): this;

	fire(type: AchievementEditEventTypes.INDICATOR_ADDED, achievement: Achievement, achievementIndicator: AchievementIndicator, indicator: Indicator): this;
	on(type: AchievementEditEventTypes.INDICATOR_ADDED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator, indicator: Indicator) => void): this;
	off(type: AchievementEditEventTypes.INDICATOR_ADDED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator, indicator: Indicator) => void): this;

	fire(type: AchievementEditEventTypes.COMPUTE_INDICATOR_ADDED, achievement: Achievement, achievementIndicator: AchievementIndicator): this;
	on(type: AchievementEditEventTypes.COMPUTE_INDICATOR_ADDED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator) => void): this;
	off(type: AchievementEditEventTypes.COMPUTE_INDICATOR_ADDED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator) => void): this;

	fire(type: AchievementEditEventTypes.INDICATOR_REMOVED, achievement: Achievement, achievementIndicator: AchievementIndicator): this;
	on(type: AchievementEditEventTypes.INDICATOR_REMOVED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator) => void): this;
	off(type: AchievementEditEventTypes.INDICATOR_REMOVED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator) => void): this;

	fire(type: AchievementEditEventTypes.INDICATOR_NAME_CHANGED, achievement: Achievement, achievementIndicator: AchievementIndicator): this;
	on(type: AchievementEditEventTypes.INDICATOR_NAME_CHANGED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator) => void): this;
	off(type: AchievementEditEventTypes.INDICATOR_NAME_CHANGED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator) => void): this;

	fire(type: AchievementEditEventTypes.INDICATOR_CRITERIA_ADDED, achievement: Achievement, achievementIndicator: AchievementIndicator): this;
	on(type: AchievementEditEventTypes.INDICATOR_CRITERIA_ADDED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator) => void): this;
	off(type: AchievementEditEventTypes.INDICATOR_CRITERIA_ADDED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator) => void): this;

	fire(type: AchievementEditEventTypes.INDICATOR_CRITERIA_CHANGED, achievement: Achievement, achievementIndicator: AchievementIndicator): this;
	on(type: AchievementEditEventTypes.INDICATOR_CRITERIA_CHANGED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator) => void): this;
	off(type: AchievementEditEventTypes.INDICATOR_CRITERIA_CHANGED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator) => void): this;

	fire(type: AchievementEditEventTypes.INDICATOR_CRITERIA_FACTOR_CHANGED, achievement: Achievement, achievementIndicator: AchievementIndicator, criteria: AchievementIndicatorCriteria): this;
	on(type: AchievementEditEventTypes.INDICATOR_CRITERIA_FACTOR_CHANGED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator, criteria: AchievementIndicatorCriteria) => void): this;
	off(type: AchievementEditEventTypes.INDICATOR_CRITERIA_FACTOR_CHANGED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator, criteria: AchievementIndicatorCriteria) => void): this;

	fire(type: AchievementEditEventTypes.INDICATOR_CRITERIA_ARITHMETIC_CHANGED, achievement: Achievement, achievementIndicator: AchievementIndicator, criteria: AchievementIndicatorCriteria): this;
	on(type: AchievementEditEventTypes.INDICATOR_CRITERIA_ARITHMETIC_CHANGED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator, criteria: AchievementIndicatorCriteria) => void): this;
	off(type: AchievementEditEventTypes.INDICATOR_CRITERIA_ARITHMETIC_CHANGED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator, criteria: AchievementIndicatorCriteria) => void): this;

	fire(type: AchievementEditEventTypes.INDICATOR_CRITERIA_REMOVED, achievement: Achievement, achievementIndicator: AchievementIndicator): this;
	on(type: AchievementEditEventTypes.INDICATOR_CRITERIA_REMOVED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator) => void): this;
	off(type: AchievementEditEventTypes.INDICATOR_CRITERIA_REMOVED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator) => void): this;

	fire(type: AchievementEditEventTypes.INDICATOR_AGGREGATION_CHANGED, achievement: Achievement, achievementIndicator: AchievementIndicator): this;
	on(type: AchievementEditEventTypes.INDICATOR_AGGREGATION_CHANGED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator) => void): this;
	off(type: AchievementEditEventTypes.INDICATOR_AGGREGATION_CHANGED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator) => void): this;

	fire(type: AchievementEditEventTypes.INDICATOR_FORMULA_CHANGED, achievement: Achievement, achievementIndicator: AchievementIndicator): this;
	on(type: AchievementEditEventTypes.INDICATOR_FORMULA_CHANGED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator) => void): this;
	off(type: AchievementEditEventTypes.INDICATOR_FORMULA_CHANGED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator) => void): this;

	fire(type: AchievementEditEventTypes.INDICATOR_SCORE_INCLUDE_CHANGED, achievement: Achievement, achievementIndicator: AchievementIndicator): this;
	on(type: AchievementEditEventTypes.INDICATOR_SCORE_INCLUDE_CHANGED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator) => void): this;
	off(type: AchievementEditEventTypes.INDICATOR_SCORE_INCLUDE_CHANGED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator) => void): this;

	fire(type: AchievementEditEventTypes.VALUES_CHANGED, achievement: Achievement, achievementIndicator: AchievementIndicator, values: IndicatorValues): this;
	on(type: AchievementEditEventTypes.VALUES_CHANGED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator, values: IndicatorValues) => void): this;
	off(type: AchievementEditEventTypes.VALUES_CHANGED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator, values: IndicatorValues) => void): this;

	fire(type: AchievementEditEventTypes.VALUES_CALCULATED, achievement: Achievement, achievementIndicator: AchievementIndicator, values: CalculatedIndicatorValues): this;
	on(type: AchievementEditEventTypes.VALUES_CALCULATED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator, values: CalculatedIndicatorValues) => void): this;
	off(type: AchievementEditEventTypes.VALUES_CALCULATED, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator, values: CalculatedIndicatorValues) => void): this;

	fire(type: AchievementEditEventTypes.ASK_CALCULATED_VALUES, achievement: Achievement, achievementIndicator: AchievementIndicator, onData: (values: CalculatedIndicatorValues) => void): this;
	on(type: AchievementEditEventTypes.ASK_CALCULATED_VALUES, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator, onData: (values: CalculatedIndicatorValues) => void) => void): this;
	off(type: AchievementEditEventTypes.ASK_CALCULATED_VALUES, listener: (achievement: Achievement, achievementIndicator: AchievementIndicator, onData: (values: CalculatedIndicatorValues) => void) => void): this;
}