import {Achievement, AchievementIndicator} from '@/services/data/tuples/achievement-types';
import {isNotNull} from '@/services/data/utils';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Fragment, useEffect, useState} from 'react';
import {interpolation, toNumber} from '../indicator-values-calculator';
import {useAchievementEditEventBus} from '../achievement-edit-event-bus';
import {AchievementEditEventTypes} from '../achievement-edit-event-bus-types';
import {
	AllCalculatedIndicatorValuesData,
	AllIndicatedValuesCalculationResult,
	CalculatedIndicatorValues
} from '../types';
import {useIndicatorValuesAggregator} from '../use-indicator-values-aggregator';

const buildScoreComputer = (achievementIndicator: AchievementIndicator) => {
	return (data: AllCalculatedIndicatorValuesData): AllIndicatedValuesCalculationResult => {
		const script = achievementIndicator.formula;
		if (script == null || script.trim().length === 0) {
			return {
				failed: false,
				shouldComputeScore: false
			};
		}

		const indicators = data.filter(({indicator}) => {
			return indicator !== achievementIndicator && isNotNull(indicator.variableName);
		});
		try {
			const mathFunctionNames = Object.getOwnPropertyNames(Math);
			const runScript = script.split('\n')
				.filter(x => x != null && x.trim().length !== 0)
				.map((line, index, lines) => {
					return lines.length === index + 1 ? `return ${line}` : line;
				}).join('\n');
			const args = [
				...(indicators.map(({indicator: {variableName}}) => variableName) as Array<string>),
				...mathFunctionNames,
				'interpolation',
				runScript];
			// eslint-disable-next-line
			const func = new Function(...args);
			const params = [
				...indicators.map(({values}) => {
					return {
						c: values.current?.value,
						p: values.previous?.value,
						r: values.ratio?.value != null ? (values.ratio.value / 100) : (void 0),
						s: values.score?.value
					};
				}),
				// @ts-ignore
				...mathFunctionNames.map(name => Math[name]),
				interpolation
			];
			const score = toNumber(func(...params));
			return {
				failed: false,
				shouldComputeScore: true,
				score: score === '' ? (void 0) : {
					value: Number(score),
					formatted: Number(score).toFixed(1)
				}
			};
		} catch (e: any) {
			console.groupCollapsed('Achievement Indicator Formula Script Error');
			console.error(e);
			console.groupEnd();
			return {
				failed: true,
				failureReason: e.message || 'Achievement Indicator Formula Script Error.',
				shouldComputeScore: true
			};
		}
	};
};

const buildIndicatorRemovedAndValuesCalculatedAvoidHandler = (nav1: Achievement, ni1: AchievementIndicator) => {
	return (nav2: Achievement, ni2: AchievementIndicator) => nav1 !== nav2 || ni1 === ni2;
};
const buildFormulaChangedAvoidHandler = (nav1: Achievement, ni1: AchievementIndicator) => {
	return (nav2: Achievement, ni2: AchievementIndicator) => nav1 !== nav2 || ni1 !== ni2;
};
const alwaysAvoidScoreIncludeChanged = () => true;

const buildCalculatedIndicatorValues = (result: AllIndicatedValuesCalculationResult): CalculatedIndicatorValues => {
	return {
		loaded: true,
		loadFailed: false,
		calculated: true,
		calculateFailed: result.failed,
		calculateFailureReason: result.failureReason,
		score: result.score,
		shouldComputeScore: result.shouldComputeScore
	};
};

export const OtherIndicatorValuesCalculator = (props: {
	achievement: Achievement;
	achievementIndicator: AchievementIndicator
}) => {
	const {achievement, achievementIndicator} = props;

	const {on, off, fire} = useAchievementEditEventBus();
	const forceUpdate = useForceUpdate();
	const [functions, setFunctions] = useState(() => {
		return {
			shouldAvoidIndicatorRemovedAndValuesCalculated: buildIndicatorRemovedAndValuesCalculatedAvoidHandler(achievement, achievementIndicator),
			shouldAvoidFormulaChanged: buildFormulaChangedAvoidHandler(achievement, achievementIndicator),
			computeScore: buildScoreComputer(achievementIndicator),
			onComputed: (result: AllIndicatedValuesCalculationResult) => {
				fire(AchievementEditEventTypes.VALUES_CALCULATED, achievement, achievementIndicator, buildCalculatedIndicatorValues(result));
				forceUpdate();
			}
		};
	});
	const allValues = useIndicatorValuesAggregator({
		achievement,
		shouldAvoidIndicatorRemovedAndValuesCalculated: functions.shouldAvoidIndicatorRemovedAndValuesCalculated,
		shouldAvoidFormulaChanged: functions.shouldAvoidFormulaChanged,
		shouldAvoidScoreIncludeChanged: alwaysAvoidScoreIncludeChanged,
		compute: functions.computeScore,
		onComputed: functions.onComputed,
		shouldAvoidButterflyEffect: true
	});
	useEffect(() => {
		setFunctions(() => {
			return {
				shouldAvoidIndicatorRemovedAndValuesCalculated: buildIndicatorRemovedAndValuesCalculatedAvoidHandler(achievement, achievementIndicator),
				shouldAvoidFormulaChanged: buildFormulaChangedAvoidHandler(achievement, achievementIndicator),
				computeScore: buildScoreComputer(achievementIndicator),
				onComputed: (result: AllIndicatedValuesCalculationResult) => {
					fire(AchievementEditEventTypes.VALUES_CALCULATED, achievement, achievementIndicator, buildCalculatedIndicatorValues(result));
					forceUpdate();
				}
			};
		});
	}, [fire, forceUpdate, achievement, achievementIndicator]);
	useEffect(() => {
		const onAskCalculatedValues = (aAchievement: Achievement, aAchievementIndicator: AchievementIndicator, onData: (values: CalculatedIndicatorValues) => void) => {
			if (aAchievement !== achievement || aAchievementIndicator !== achievementIndicator) {
				return;
			}
			onData(buildCalculatedIndicatorValues(allValues));
		};
		on(AchievementEditEventTypes.ASK_CALCULATED_VALUES, onAskCalculatedValues);
		return () => {
			off(AchievementEditEventTypes.ASK_CALCULATED_VALUES, onAskCalculatedValues);
		};
	}, [on, off, achievement, achievementIndicator, allValues]);

	return <Fragment/>;
};