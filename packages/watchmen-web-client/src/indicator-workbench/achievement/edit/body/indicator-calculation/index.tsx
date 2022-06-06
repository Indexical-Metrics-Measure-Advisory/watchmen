import {Indicator} from '@/services/data/tuples/indicator-types';
import {Achievement, AchievementIndicator} from '@/services/data/tuples/achievement-types';
import {useEffect, useState} from 'react';
import {IndicatorValuesCalculator} from '../indicator-values-calculator';
import {useAchievementEditEventBus} from '../achievement-edit-event-bus';
import {AchievementEditEventTypes} from '../achievement-edit-event-bus-types';
import {IndicatorCriteriaDefData} from '../types';
import {Expandable, useIndicatorPartExpandable} from '../use-indicator-part-expandable';
import {isReadyToCalculation} from '../utils';
import {Calculator} from './calculator';
import {IndicatorCalculationFormula} from './formula';
import {LineToParent} from './line-to-parent';
import {IndicatorCalculationNodeContent} from './node-content';
import {IndicatorCalculationNodeContainer} from './widgets';

const InternalIndicatorCalculation = (props: {
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
	defData: IndicatorCriteriaDefData;
	id: string;
}) => {
	const {achievement, achievementIndicator, defData, id} = props;

	const {containerRef, expanded} = useIndicatorPartExpandable({
		achievement,
		achievementIndicator,
		expandable: Expandable.CALCULATION
	});

	return <>
		<LineToParent achievement={achievement} achievementIndicator={achievementIndicator}/>
		<IndicatorCalculationNodeContainer ref={containerRef}>
			<IndicatorCalculationNodeContent id={id} achievement={achievement} achievementIndicator={achievementIndicator}
			                                 expanded={expanded}/>
			<IndicatorCalculationFormula achievement={achievement} achievementIndicator={achievementIndicator}
			                             expanded={expanded}/>
		</IndicatorCalculationNodeContainer>
		<IndicatorValuesCalculator achievement={achievement} achievementIndicator={achievementIndicator}/>
		<Calculator achievement={achievement} achievementIndicator={achievementIndicator} defData={defData}/>
	</>;
};

export const IndicatorCalculation = (props: {
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
	indicator: Indicator;
	defData: IndicatorCriteriaDefData;
	id: string;
}) => {
	const {achievement, achievementIndicator, defData, id} = props;

	const {on: onEdit, off: offEdit} = useAchievementEditEventBus();
	const [ready, setReady] = useState(isReadyToCalculation(achievement, achievementIndicator, defData));
	useEffect(() => {
		const onIndicatorCriteriaChanged = (aAchievement: Achievement, aAchievementIndicator: AchievementIndicator) => {
			if (aAchievement !== achievement || aAchievementIndicator !== achievementIndicator) {
				return;
			}

			const newReady = isReadyToCalculation(achievement, achievementIndicator, defData);
			if (newReady !== ready) {
				setReady(newReady);
			}
		};
		const onTimeRangeChanged = (aAchievement: Achievement) => {
			if (aAchievement !== achievement) {
				return;
			}

			const newReady = isReadyToCalculation(achievement, achievementIndicator, defData);
			if (newReady !== ready) {
				setReady(newReady);
			}
		};
		onEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_ADDED, onIndicatorCriteriaChanged);
		onEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_CHANGED, onIndicatorCriteriaChanged);
		onEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_REMOVED, onIndicatorCriteriaChanged);
		onEdit(AchievementEditEventTypes.TIME_RANGE_CHANGED, onTimeRangeChanged);
		return () => {
			offEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_ADDED, onIndicatorCriteriaChanged);
			offEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_CHANGED, onIndicatorCriteriaChanged);
			offEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_REMOVED, onIndicatorCriteriaChanged);
			offEdit(AchievementEditEventTypes.TIME_RANGE_CHANGED, onTimeRangeChanged);
		};
	}, [onEdit, offEdit, achievement, achievementIndicator, defData, ready]);

	if (!ready) {
		return null;
	}

	return <InternalIndicatorCalculation id={id} achievement={achievement} achievementIndicator={achievementIndicator}
	                                     defData={defData}/>;
};