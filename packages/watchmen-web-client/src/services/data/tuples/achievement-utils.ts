import {
	AchievementIndicator,
	MANUAL_COMPUTE_ACHIEVEMENT_INDICATOR_ID,
	ManualComputeAchievementIndicator
} from './achievement-types';

export const isManualComputeAchievementIndicator = (achievementIndicator: AchievementIndicator): achievementIndicator is ManualComputeAchievementIndicator => {
	// eslint-disable-next-line
	return achievementIndicator.indicatorId == MANUAL_COMPUTE_ACHIEVEMENT_INDICATOR_ID;
};