import {
	Achievement,
	AchievementIndicator,
	AchievementTimeRangeType,
	MANUAL_COMPUTE_ACHIEVEMENT_INDICATOR_ID,
	ManualComputeAchievementIndicator
} from '@/services/data/tuples/achievement-types';
import {Indicator, IndicatorAggregateArithmetic} from '@/services/data/tuples/indicator-types';
import {generateUuid} from '@/services/data/tuples/utils';
import {getCurrentTime} from '@/services/data/utils';
import {base64Encode} from '@/services/utils';
import {getCurrentLanguage} from '@/widgets/langs';

export const createAchievement = (name?: string): Achievement => {
	const achievementId = generateUuid();
	return {
		achievementId,
		name: name || `${getCurrentLanguage().PLAIN.NEW_ACHIEVEMENT_NAME} ${base64Encode(achievementId).substring(0, 12)}`,
		indicators: [],
		timeRangeType: AchievementTimeRangeType.YEAR,
		timeRangeYear: `${new Date().getFullYear() - 1}`,
		compareWithPreviousTimeRange: false,
		finalScoreIsRatio: false,
		version: 1,
		createdAt: getCurrentTime(),
		lastModifiedAt: getCurrentTime()
	};
};

const generateVariableName = (achievement: Achievement, achievementIndicator: AchievementIndicator) => {
	if (achievement.indicators.length === 0) {
		achievementIndicator.variableName = 'v1';
	} else {
		const max = achievement.indicators.map(({variableName = 'v0'}) => {
			return Number(variableName.replace('v', ''));
		}).reduce((max, index) => {
			return Math.max(max, index);
		}, 0);
		achievementIndicator.variableName = `v${max + 1}`;
	}
};
export const createAchievementIndicator = (achievement: Achievement, indicator: Indicator): AchievementIndicator => {
	const achievementIndicator: AchievementIndicator = {
		indicatorId: indicator.indicatorId,
		name: '',
		criteria: [],
		aggregateArithmetic: indicator.aggregateArithmetic ?? (indicator.factorId == null ? IndicatorAggregateArithmetic.COUNT : IndicatorAggregateArithmetic.SUM)
	};
	if (achievement.indicators == null) {
		achievement.indicators = [];
	}
	generateVariableName(achievement, achievementIndicator);
	achievement.indicators.push(achievementIndicator);
	return achievementIndicator;
};

export const createAchievementManualComputeIndicator = (achievement: Achievement): ManualComputeAchievementIndicator => {
	const achievementIndicator: ManualComputeAchievementIndicator = {
		indicatorId: MANUAL_COMPUTE_ACHIEVEMENT_INDICATOR_ID,
		name: '',
		criteria: [],
		aggregateArithmetic: IndicatorAggregateArithmetic.MAX
	};
	if (achievement.indicators == null) {
		achievement.indicators = [];
	}
	generateVariableName(achievement, achievementIndicator);
	achievement.indicators.push(achievementIndicator);
	return achievementIndicator;
};