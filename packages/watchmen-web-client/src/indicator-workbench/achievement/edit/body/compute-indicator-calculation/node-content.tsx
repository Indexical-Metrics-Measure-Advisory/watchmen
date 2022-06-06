import {Achievement, AchievementIndicator} from '@/services/data/tuples/achievement-types';
import {Lang} from '@/widgets/langs';
import {useIndicatorValuesCalculator} from '../indicator-values-calculator';
import {useAchievementEditEventBus} from '../achievement-edit-event-bus';
import {AchievementEditEventTypes} from '../achievement-edit-event-bus-types';
import {
	ComputeIndicatorCalculationNode,
	ComputeIndicatorCalculationValue,
	ComputeIndicatorCalculationVariableName
} from './widgets';

export const ComputeIndicatorCalculationNodeContent = (props: {
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
	expanded: boolean;
	id: string;
}) => {
	const {achievement, achievementIndicator, expanded, id} = props;

	const {fire} = useAchievementEditEventBus();
	const calculatedValues = useIndicatorValuesCalculator(achievement, achievementIndicator);

	const onMouseEnter = () => {
		fire(AchievementEditEventTypes.EXPAND_CALCULATION, achievement, achievementIndicator);
	};
	const onClicked = () => {
		fire(AchievementEditEventTypes.EXPAND_CALCULATION, achievement, achievementIndicator);
	};

	return <ComputeIndicatorCalculationNode id={`calc-${id}`}
	                                        error={calculatedValues.calculateFailed}
	                                        warn={calculatedValues.shouldComputeScore && !calculatedValues.calculated}
	                                        onMouseEnter={onMouseEnter} onClick={onClicked}
	                                        expanded={expanded}>
		<ComputeIndicatorCalculationVariableName compact={true}>
			{achievementIndicator.variableName}:
		</ComputeIndicatorCalculationVariableName>
		<ComputeIndicatorCalculationVariableName>[</ComputeIndicatorCalculationVariableName>
		<ComputeIndicatorCalculationVariableName>{Lang.INDICATOR_WORKBENCH.ACHIEVEMENT.COMPUTED_SCORE}=</ComputeIndicatorCalculationVariableName>
		<ComputeIndicatorCalculationValue>{calculatedValues.score?.formatted}</ComputeIndicatorCalculationValue>
		<ComputeIndicatorCalculationVariableName>]</ComputeIndicatorCalculationVariableName>
	</ComputeIndicatorCalculationNode>;
};