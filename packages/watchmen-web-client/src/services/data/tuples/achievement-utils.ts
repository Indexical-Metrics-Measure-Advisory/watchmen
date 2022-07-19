import {
	IndicatorCriteria,
	IndicatorCriteriaOnBucket,
	IndicatorCriteriaOnExpression
} from '@/services/data/tuples/indicator-criteria-types';
import {
	AchievementIndicator,
	MANUAL_COMPUTE_ACHIEVEMENT_INDICATOR_ID,
	ManualComputeAchievementIndicator
} from './achievement-types';

export const isAchievementIndicatorCriteriaOnBucket = (criteria: IndicatorCriteria): criteria is IndicatorCriteriaOnBucket => {
	return (criteria as any).bucketId != null;
};

export const isAchievementIndicatorCriteriaOnExpression = (criteria: IndicatorCriteria): criteria is IndicatorCriteriaOnExpression => {
	return (criteria as any).operator != null;
};

export const isManualComputeAchievementIndicator = (achievementIndicator: AchievementIndicator): achievementIndicator is ManualComputeAchievementIndicator => {
	// eslint-disable-next-line
	return achievementIndicator.indicatorId == MANUAL_COMPUTE_ACHIEVEMENT_INDICATOR_ID;
};