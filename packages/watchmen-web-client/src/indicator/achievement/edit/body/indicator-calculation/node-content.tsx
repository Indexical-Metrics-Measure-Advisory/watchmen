import {Achievement, AchievementIndicator} from '@/services/data/tuples/achievement-types';
import {Lang} from '@/widgets/langs';
import {useIndicatorValuesCalculator} from '../indicator-values-calculator';
import {useAchievementEditEventBus} from '../achievement-edit-event-bus';
import {AchievementEditEventTypes} from '../achievement-edit-event-bus-types';
import {IndicatorCalculationNode, IndicatorCalculationValue, IndicatorCalculationVariableName} from './widgets';

export const IndicatorCalculationNodeContent = (props: {
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

	return <IndicatorCalculationNode id={`calc-${id}`} error={calculatedValues.loadFailed}
	                                 warn={!calculatedValues.calculated}
	                                 onMouseEnter={onMouseEnter} onClick={onClicked}
	                                 expanded={expanded}>
		<IndicatorCalculationVariableName compact={true}>
			{achievementIndicator.variableName}:
		</IndicatorCalculationVariableName>
		<IndicatorCalculationVariableName>[</IndicatorCalculationVariableName>
		<IndicatorCalculationVariableName>{Lang.INDICATOR.ACHIEVEMENT.CURRENT_VALUE}=</IndicatorCalculationVariableName>
		<IndicatorCalculationValue>{calculatedValues.current?.formatted}</IndicatorCalculationValue>
		{achievement.compareWithPreviousTimeRange
			? <>
				<IndicatorCalculationVariableName compact={true}>,</IndicatorCalculationVariableName>
				<IndicatorCalculationVariableName>{Lang.INDICATOR.ACHIEVEMENT.PREVIOUS_VALUE}=</IndicatorCalculationVariableName>
				<IndicatorCalculationValue>{calculatedValues.previous?.formatted}</IndicatorCalculationValue>
				<IndicatorCalculationVariableName compact={true}>,</IndicatorCalculationVariableName>
				<IndicatorCalculationVariableName>{Lang.INDICATOR.ACHIEVEMENT.INCREMENT_RATIO}=</IndicatorCalculationVariableName>
				<IndicatorCalculationValue>{calculatedValues.ratio?.formatted}</IndicatorCalculationValue>
				<IndicatorCalculationValue>%</IndicatorCalculationValue>
			</>
			: null}
		{calculatedValues.shouldComputeScore
			? <>
				<IndicatorCalculationVariableName compact={true}>,</IndicatorCalculationVariableName>
				<IndicatorCalculationVariableName>{Lang.INDICATOR.ACHIEVEMENT.COMPUTED_SCORE}=</IndicatorCalculationVariableName>
				<IndicatorCalculationValue>{calculatedValues.score?.formatted}</IndicatorCalculationValue>
			</>
			: null}
		<IndicatorCalculationVariableName>]</IndicatorCalculationVariableName>
	</IndicatorCalculationNode>;
};