import {Achievement} from '@/services/data/tuples/achievement-types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {useEffect, useRef, useState} from 'react';
import {useAchievementEventBus} from '../../achievement-event-bus';
import {AchievementEventTypes} from '../../achievement-event-bus-types';
import {AllCalculatedIndicatorValuesData, AllIndicatedValuesCalculationResult} from './types';
import {useIndicatorValuesAggregator} from './use-indicator-values-aggregator';
import {AchievementRootNode} from './widgets';

const computeScore = (data: AllCalculatedIndicatorValuesData): AllIndicatedValuesCalculationResult => {
	const score = data.reduce((sum, pair) => {
		const {
			indicator: {includeInFinalScore = true},
			values: {shouldComputeScore, score: {value: score = 0} = {}}
		} = pair;
		if (shouldComputeScore && includeInFinalScore) {
			sum = sum + Number(score.toFixed(1));
		}

		return sum;
	}, 0);
	return {
		failed: false,
		shouldComputeScore: true,
		score: {
			value: score,
			formatted: score.toFixed(1)
		}
	};
};

const alwaysAvoidFormulaChanged = () => true;

export const AchievementRoot = (props: { id: string; achievement: Achievement }) => {
	const {id, achievement} = props;

	const ref = useRef<HTMLDivElement>(null);
	const {on, off} = useAchievementEventBus();
	const [avoidValuesEvent, setAvoidValuesEvent] = useState(() => {
		return (aAchievement: Achievement) => aAchievement !== achievement;
	});
	const forceUpdate = useForceUpdate();
	const {score: {formatted: score} = {}, shouldComputeScore} = useIndicatorValuesAggregator({
		achievement,
		shouldAvoidIndicatorRemovedAndValuesCalculated: avoidValuesEvent,
		shouldAvoidFormulaChanged: alwaysAvoidFormulaChanged,
		shouldAvoidScoreIncludeChanged: avoidValuesEvent,
		compute: computeScore,
		// don't know why call forceUpdate directly cannot do repaint, but it works after a timeout
		onComputed: () => setTimeout(() => forceUpdate(), 100),
		shouldAvoidButterflyEffect: false
	});
	useEffect(() => {
		setAvoidValuesEvent(() => (aAchievement: Achievement) => aAchievement !== achievement);
	}, [achievement]);
	useEffect(() => {
		const onNameChanged = (aAchievement: Achievement) => {
			if (aAchievement !== achievement) {
				return;
			}
			forceUpdate();
		};
		on(AchievementEventTypes.NAME_CHANGED, onNameChanged);
		return () => {
			off(AchievementEventTypes.NAME_CHANGED, onNameChanged);
		};
	}, [on, off, forceUpdate, achievement]);

	return <AchievementRootNode id={id} ref={ref}>
		<div>{achievement.name || Lang.INDICATOR_WORKBENCH.ACHIEVEMENT.ROOT}</div>
		{shouldComputeScore
			? <div>{Lang.INDICATOR_WORKBENCH.ACHIEVEMENT.SCORE_SUM_LABEL} {(score || 0)}</div>
			: null}
	</AchievementRootNode>;
};