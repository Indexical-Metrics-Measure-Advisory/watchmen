import {Achievement, AchievementIndicator} from '@/services/data/tuples/achievement-types';
import {Expandable, useIndicatorPartExpandable} from '../use-indicator-part-expandable';
import {ComputeIndicatorCalculationFormula} from './formula';
import {LineToParent} from './line-to-parent';
import {ComputeIndicatorCalculationNodeContent} from './node-content';
import {OtherIndicatorValuesCalculator} from './other-indicator-values-calulator';
import {ComputeIndicatorCalculationNodeContainer} from './widgets';

export const ComputeIndicatorCalculation = (props: {
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
	id: string;
}) => {
	const {achievement, achievementIndicator, id} = props;

	const {containerRef, expanded} = useIndicatorPartExpandable({
		achievement,
		achievementIndicator,
		expandable: Expandable.CALCULATION
	});

	return <>
		<LineToParent achievement={achievement} achievementIndicator={achievementIndicator}/>
		<ComputeIndicatorCalculationNodeContainer ref={containerRef}>
			<ComputeIndicatorCalculationNodeContent id={id} achievement={achievement}
			                                        achievementIndicator={achievementIndicator}
			                                        expanded={expanded}/>
			<ComputeIndicatorCalculationFormula achievement={achievement} achievementIndicator={achievementIndicator}
			                                    expanded={expanded}/>
		</ComputeIndicatorCalculationNodeContainer>
		<OtherIndicatorValuesCalculator achievement={achievement} achievementIndicator={achievementIndicator}/>
	</>;
};