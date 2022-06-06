import {Achievement, AchievementIndicator} from '@/services/data/tuples/achievement-types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {useEffect} from 'react';
import {useAchievementEditEventBus} from '../achievement-edit-event-bus';
import {AchievementEditEventTypes} from '../achievement-edit-event-bus-types';
import {IndicatorCriteriaDefData} from '../types';
import {isReadyToCalculation} from '../utils';

export const useCriteriaValidation = (options: {
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
	defData: IndicatorCriteriaDefData;
}) => {
	const {achievement, achievementIndicator, defData} = options;

	const {on, off} = useAchievementEditEventBus();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onIndicatorCriteriaChanged = (aAchievement: Achievement, aAchievementIndicator: AchievementIndicator) => {
			if (aAchievement !== achievement || aAchievementIndicator !== achievementIndicator) {
				return;
			}
			forceUpdate();
		};
		on(AchievementEditEventTypes.INDICATOR_CRITERIA_ADDED, onIndicatorCriteriaChanged);
		on(AchievementEditEventTypes.INDICATOR_CRITERIA_CHANGED, onIndicatorCriteriaChanged);
		on(AchievementEditEventTypes.INDICATOR_CRITERIA_REMOVED, onIndicatorCriteriaChanged);
		return () => {
			off(AchievementEditEventTypes.INDICATOR_CRITERIA_ADDED, onIndicatorCriteriaChanged);
			off(AchievementEditEventTypes.INDICATOR_CRITERIA_CHANGED, onIndicatorCriteriaChanged);
			off(AchievementEditEventTypes.INDICATOR_CRITERIA_REMOVED, onIndicatorCriteriaChanged);
		};
	}, [on, off, forceUpdate, achievement, achievementIndicator]);

	const error = defData.loaded && defData.topic == null;
	const warn = !isReadyToCalculation(achievement, achievementIndicator, defData);

	return {error, warn};
};