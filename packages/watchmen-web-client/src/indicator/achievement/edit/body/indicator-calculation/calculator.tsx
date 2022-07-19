import {fetchAchievementIndicatorData} from '@/services/data/tuples/achievement';
import {Achievement, AchievementIndicator, AchievementTimeRangeType} from '@/services/data/tuples/achievement-types';
import {isIndicatorCriteriaOnExpression} from '@/services/data/tuples/indicator-criteria-utils';
import {MeasureMethod} from '@/services/data/tuples/indicator-types';
import {findTopicAndFactor, tryToTransformToMeasures} from '@/services/data/tuples/indicator-utils';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {FireTiming, useThrottler} from '@/widgets/throttler';
import {Fragment, useEffect} from 'react';
import {useAchievementEditEventBus} from '../achievement-edit-event-bus';
import {AchievementEditEventTypes} from '../achievement-edit-event-bus-types';
import {IndicatorCriteriaDefData, IndicatorValues} from '../types';
import {isReadyToCalculation} from '../utils';
import {AchievementIndicatorData} from './types';

const replaceYear = (r: string) => (s: string): string => {
	return s.replace(/year/gi, r);
};
const replaceMonth = (r: string) => (s: string): string => {
	return s.replace(/month/gi, r);
};
const replaceYM = (s: string, funcs: Array<(s: string) => string>) => {
	return funcs.reduce((s, func) => func(s), s);
};

const buildYear = (achievement: Achievement): number => {
	const y = (achievement.timeRangeYear ?? `${new Date().getFullYear() - 1}`);
	if (Number.isNaN(Number(y))) {
		return new Date().getFullYear() - 1;
	} else {
		return Number(y);
	}
};
const buildMonth = (achievement: Achievement): number => {
	const m = achievement.timeRangeMonth ?? '1';
	if (Number.isNaN(Number(m))) {
		return 1;
	} else {
		return Number(m);
	}
};
const buildYM = (achievement: Achievement, current: boolean): { year: string, month: string } => {
	const year = buildYear(achievement);
	const month = buildMonth(achievement);
	if (current) {
		return {
			year: year + '',
			month: month + ''
		};
	} else if (achievement.timeRangeType === AchievementTimeRangeType.MONTH) {
		if (month === 1) {
			return {year: (year - 1) + '', month: '12'};
		} else {
			return {
				year: year + '',
				month: (month - 1) + ''
			};
		}
	} else {
		return {
			year: (year - 1) + '',
			month: month + ''
		};
	}
};

const replace = (options: {
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
	defData: IndicatorCriteriaDefData;
	current: boolean;
}) => {
	const {achievement, achievementIndicator, defData, current} = options;

	const {year, month} = buildYM(achievement, current);

	return {
		...achievementIndicator,
		criteria: (achievementIndicator.criteria || []).map(criteria => {
			if (isIndicatorCriteriaOnExpression(criteria)) {
				let measures: Array<MeasureMethod> = [];
				if (defData.topic != null) {
					// eslint-disable-next-line
					const factor = (defData.topic?.factors || []).find(factor => factor.factorId == criteria.factorId);
					if (factor == null) {
						return {...criteria};
					}
					measures = tryToTransformToMeasures(factor);
				} else if (defData.subject != null) {
					// eslint-disable-next-line
					const column = (defData.subject.dataset.columns || []).find(column => column.columnId == criteria.factorId);
					if (column == null) {
						return {...criteria};
					}
					const {factor} = findTopicAndFactor(column, defData.subject);
					if (factor == null) {
						return {...criteria};
					} else {
						measures = tryToTransformToMeasures(factor);
					}
				}

				let newValue = criteria.value || '';
				if (measures.includes(MeasureMethod.YEAR) && measures.includes(MeasureMethod.MONTH)) {
					newValue = replaceYM(newValue, [
						replaceYear(year),
						replaceMonth(month)
					]);
				} else if (measures.includes(MeasureMethod.YEAR)) {
					newValue = replaceYear(year)(newValue);
				} else if (measures.includes(MeasureMethod.MONTH)) {
					newValue = replaceMonth(month)(newValue);
				}
				return {...criteria, value: newValue};
			} else {
				return {...criteria};
			}
		})
	};
};

const askData = (options: {
	fire: (type: EventTypes.INVOKE_REMOTE_REQUEST, ask: () => Promise<AchievementIndicatorData>, success: (data: AchievementIndicatorData) => void, fail: () => void) => void;
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
	onData: (values: IndicatorValues) => void;
	defData: IndicatorCriteriaDefData;
}) => {
	const {fire, achievement, achievementIndicator, onData, defData} = options;

	if (!isReadyToCalculation(achievement, achievementIndicator, defData)) {
		return () => onData({loaded: false, failed: false});
	}

	return (saveTime: FireTiming) => {
		if (saveTime === FireTiming.UNMOUNT) {
			return;
		}
		fire(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => {
				if (achievement.compareWithPreviousTimeRange) {
					return await fetchAchievementIndicatorData(
						replace({achievement, achievementIndicator, defData, current: true}),
						replace({achievement, achievementIndicator, defData, current: false})
					);
				} else {
					return await fetchAchievementIndicatorData(
						replace({achievement, achievementIndicator, defData, current: true})
					);
				}
			},
			({current, previous}) => {
				onData({loaded: true, failed: false, current, previous});
			},
			() => {
				onData({loaded: true, failed: true});
			});
	};
};

export const Calculator = (props: {
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
	defData: IndicatorCriteriaDefData;
}) => {
	const {achievement, achievementIndicator, defData} = props;

	const {fire: fireGlobal} = useEventBus();
	const {on: onEdit, off: offEdit, fire: fireEdit} = useAchievementEditEventBus();
	const saveQueue = useThrottler();
	useEffect(() => {
		saveQueue.replace(askData({
			fire: fireGlobal,
			achievement,
			achievementIndicator,
			onData: (values: IndicatorValues) => fireEdit(AchievementEditEventTypes.VALUES_CHANGED, achievement, achievementIndicator, values),
			defData
		}), 300);
	}, [fireGlobal, fireEdit, achievement, achievementIndicator, defData, defData.loaded, defData.topic, saveQueue]);
	useEffect(() => {
		const onIndicatorCriteriaChanged = (aAchievement: Achievement, aAchievementIndicator: AchievementIndicator) => {
			if (aAchievement !== achievement || aAchievementIndicator !== achievementIndicator) {
				return;
			}

			saveQueue.replace(askData({
				fire: fireGlobal,
				achievement,
				achievementIndicator,
				onData: (values: IndicatorValues) => fireEdit(AchievementEditEventTypes.VALUES_CHANGED, achievement, achievementIndicator, values),
				defData
			}), 300);
		};
		const onTimeRangeChanged = (aAchievement: Achievement) => {
			if (aAchievement !== achievement) {
				return;
			}

			saveQueue.replace(askData({
				fire: fireGlobal,
				achievement,
				achievementIndicator,
				onData: (values: IndicatorValues) => fireEdit(AchievementEditEventTypes.VALUES_CHANGED, achievement, achievementIndicator, values),
				defData
			}), 300);
		};
		onEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_ADDED, onIndicatorCriteriaChanged);
		onEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_CHANGED, onIndicatorCriteriaChanged);
		onEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_REMOVED, onIndicatorCriteriaChanged);
		onEdit(AchievementEditEventTypes.INDICATOR_AGGREGATION_CHANGED, onIndicatorCriteriaChanged);
		onEdit(AchievementEditEventTypes.TIME_RANGE_CHANGED, onTimeRangeChanged);
		return () => {
			offEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_ADDED, onIndicatorCriteriaChanged);
			offEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_CHANGED, onIndicatorCriteriaChanged);
			offEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_REMOVED, onIndicatorCriteriaChanged);
			offEdit(AchievementEditEventTypes.INDICATOR_AGGREGATION_CHANGED, onIndicatorCriteriaChanged);
			offEdit(AchievementEditEventTypes.TIME_RANGE_CHANGED, onTimeRangeChanged);
		};
	}, [fireGlobal, onEdit, offEdit, fireEdit, achievement, achievementIndicator, defData, saveQueue]);

	return <Fragment/>;
};