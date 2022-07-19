import {Achievement} from '@/services/data/tuples/achievement-types';
import {noop} from '@/services/utils';
import {CheckBox} from '@/widgets/basic/checkbox';
import {useTooltip} from '@/widgets/basic/tooltip';
import {TooltipAlignment} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import React, {useEffect, useRef, useState} from 'react';
import {useAchievementEventBus} from '../../achievement-event-bus';
import {AchievementEventTypes} from '../../achievement-event-bus-types';
import {AllCalculatedIndicatorValuesData, AllIndicatedValuesCalculationResult} from './types';
import {useIndicatorValuesAggregator} from './use-indicator-values-aggregator';
import {AchievementRootIsRatio, AchievementRootName, AchievementRootNode, AchievementRootScore} from './widgets';

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
	const ratioRef = useRef<HTMLDivElement>(null);
	const {on, off, fire} = useAchievementEventBus();
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
	const tooltip = useTooltip<HTMLDivElement>({
		use: true,
		tooltip: Lang.INDICATOR.ACHIEVEMENT.FINAL_SCORE_IS_RATIO,
		target: ratioRef,
		alignment: TooltipAlignment.CENTER
	});

	const onFinalScoreIsRatioChanged = (value: boolean) => {
		achievement.finalScoreIsRatio = value;
		fire(AchievementEventTypes.SAVE_ACHIEVEMENT, achievement, noop);
		forceUpdate();
	};

	const displayScore = achievement.finalScoreIsRatio
		? new Intl.NumberFormat(undefined, {
			style: 'percent',
			minimumFractionDigits: 0,
			maximumFractionDigits: 1
		}).format(Number(score ?? 0))
		: score;

	return <AchievementRootNode id={id} ref={ref}>
		<AchievementRootName>{achievement.name || Lang.INDICATOR.ACHIEVEMENT.ROOT}</AchievementRootName>
		{shouldComputeScore
			// ? <div>{Lang.INDICATOR.ACHIEVEMENT.SCORE_SUM_LABEL} {(score || 0)}</div>
			? <AchievementRootScore>{(displayScore || 0)}</AchievementRootScore>
			: null}
		<AchievementRootIsRatio {...tooltip} ref={ratioRef}>
			<CheckBox value={achievement.finalScoreIsRatio ?? false} onChange={onFinalScoreIsRatioChanged}/>
		</AchievementRootIsRatio>
	</AchievementRootNode>;
};