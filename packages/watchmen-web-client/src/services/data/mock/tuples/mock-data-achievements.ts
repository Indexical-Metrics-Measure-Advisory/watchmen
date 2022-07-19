import {
	Achievement,
	AchievementTimeRangeType,
	MANUAL_COMPUTE_ACHIEVEMENT_INDICATOR_ID
} from '../../tuples/achievement-types';
import {IndicatorCriteriaOnBucket} from '../../tuples/indicator-criteria-types';
import {IndicatorAggregateArithmetic} from '../../tuples/indicator-types';
import {getCurrentTime} from '../../utils';
import {BUCKET_CITIES_ID} from './mock-data-buckets';
import {INDICATOR_ORDER_PREMIUM_ID} from './mock-data-indicators';

export const ACHIEVEMENT_PREMIUM_ID = '1';

export const NavPremium: Achievement = {
	achievementId: ACHIEVEMENT_PREMIUM_ID,
	name: 'Premium',
	indicators: [{
		name: '',
		indicatorId: INDICATOR_ORDER_PREMIUM_ID,
		criteria: [
			{
				factorId: '209',
				bucketId: BUCKET_CITIES_ID,
				bucketSegmentName: 'NY'
			} as IndicatorCriteriaOnBucket
		],
		formula: 'interpolation(r, 0.1, 10, 0.8, 20)',
		aggregateArithmetic: IndicatorAggregateArithmetic.SUM,
		variableName: 'v1'
	}, {
		name: '',
		indicatorId: MANUAL_COMPUTE_ACHIEVEMENT_INDICATOR_ID,
		criteria: [],
		formula: 'v1.s * 10',
		aggregateArithmetic: IndicatorAggregateArithmetic.MAX,
		variableName: 'v2'
	}],
	timeRangeType: AchievementTimeRangeType.YEAR,
	timeRangeYear: `${new Date().getFullYear() - 1}`,
	compareWithPreviousTimeRange: true,
	finalScoreIsRatio: false,
	description: 'Premium Achievement',
	createdAt: getCurrentTime(),
	lastModifiedAt: getCurrentTime()
};

export const DemoAchievements = [NavPremium];
export const DemoQueryAchievements = DemoAchievements;