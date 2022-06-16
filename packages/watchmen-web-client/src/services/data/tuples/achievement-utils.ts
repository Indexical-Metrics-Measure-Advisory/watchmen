import {
	AchievementIndicator,
	AchievementIndicatorCriteria,
	AchievementIndicatorCriteriaOnBucket,
	AchievementIndicatorCriteriaOnExpression,
	MANUAL_COMPUTE_ACHIEVEMENT_INDICATOR_ID,
	ManualComputeAchievementIndicator
} from './achievement-types';

export const isAchievementIndicatorCriteriaOnBucket = (criteria: AchievementIndicatorCriteria): criteria is AchievementIndicatorCriteriaOnBucket => {
	return (criteria as any).bucketId != null;
};

export const isAchievementIndicatorCriteriaOnExpression = (criteria: AchievementIndicatorCriteria): criteria is AchievementIndicatorCriteriaOnExpression => {
	return (criteria as any).operator != null;
};

export const isManualComputeAchievementIndicator = (achievementIndicator: AchievementIndicator): achievementIndicator is ManualComputeAchievementIndicator => {
	// eslint-disable-next-line
	return achievementIndicator.indicatorId == MANUAL_COMPUTE_ACHIEVEMENT_INDICATOR_ID;
};