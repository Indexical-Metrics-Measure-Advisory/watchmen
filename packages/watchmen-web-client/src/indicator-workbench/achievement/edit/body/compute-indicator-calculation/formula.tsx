import {Achievement, AchievementIndicator} from '@/services/data/tuples/achievement-types';
import {noop} from '@/services/utils';
import {CheckBox} from '@/widgets/basic/checkbox';
import {InputLines} from '@/widgets/basic/input-lines';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {useThrottler} from '@/widgets/throttler';
import {ChangeEvent} from 'react';
import {useAchievementEventBus} from '../../../achievement-event-bus';
import {AchievementEventTypes} from '../../../achievement-event-bus-types';
import {useAchievementEditEventBus} from '../achievement-edit-event-bus';
import {AchievementEditEventTypes} from '../achievement-edit-event-bus-types';
import {ComputeIndicatorCalculationFormulaContainer, ComputeIndicatorCalculationFormulaLabel} from './widgets';

export const ComputeIndicatorCalculationFormula = (props: {
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
	expanded: boolean;
}) => {
	const {achievement, achievementIndicator, expanded} = props;

	const {fire} = useAchievementEventBus();
	const {fire: fireEdit} = useAchievementEditEventBus();
	const saveQueue = useThrottler();
	const forceUpdate = useForceUpdate();

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

	const placeholder = `v1.c: current value of v1,
v1.p: previous value of v1,
v1.r: increment value of v1,
v1.s: score value of v1,
and v2.c/v2.p/v2.r/v2.s ... vn.c/vn.p/vn.r/vn.s
eg 1: v1.c - v1.p;
eg 2: interpolation(v1.r, -0.2, 5, 0.2, 20);
eg 3: abs(v1.c - v2.c)`;

	return <ComputeIndicatorCalculationFormulaContainer expanded={expanded}>
		<ComputeIndicatorCalculationFormulaLabel>
			{Lang.INDICATOR_WORKBENCH.ACHIEVEMENT.INDICATOR_FORMULA_LABEL}
		</ComputeIndicatorCalculationFormulaLabel>
		<InputLines value={achievementIndicator.formula ?? ''} onChange={onFormulaChanged}
		            placeholder={placeholder}/>
		<ComputeIndicatorCalculationFormulaLabel>
			{Lang.INDICATOR_WORKBENCH.ACHIEVEMENT.SCORE_INCLUDE_IN_FINAL}
		</ComputeIndicatorCalculationFormulaLabel>
		<CheckBox value={achievementIndicator.includeInFinalScore ?? true} onChange={onIncludeInFinalScoreChanged}/>
	</ComputeIndicatorCalculationFormulaContainer>;
};