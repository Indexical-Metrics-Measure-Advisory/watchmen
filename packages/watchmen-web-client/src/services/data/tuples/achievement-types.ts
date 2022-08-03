import {IndicatorCriteria} from './indicator-criteria-types';
import {IndicatorAggregateArithmetic, IndicatorId} from './indicator-types';
import {PluginId} from './plugin-types';
import {TenantId} from './tenant-types';
import {OptimisticLock, Tuple} from './tuple-types';

export type AchievementId = string;

export interface AchievementIndicator {
	indicatorId: IndicatorId;
	name: string;
	/** use sum when no aggregation arithmetic applied */
	aggregateArithmetic: IndicatorAggregateArithmetic;
	/** to compute score */
	formula?: string;
	/**
	 * if there is a score computed, should be included in final score or not.
	 * default true
	 */
	includeInFinalScore?: boolean;
	criteria: Array<IndicatorCriteria>;
	/**
	 * used to call by other indicators,
	 * create variable name when it is added into achievement,
	 * and will not be changed in anytime
	 */
	variableName?: string;
}

export const MANUAL_COMPUTE_ACHIEVEMENT_INDICATOR_ID = '-1';

/**
 * for manual compute indicator,
 * 1. indicatorId fixed as {@link MANUAL_COMPUTE_ACHIEVEMENT_INDICATOR_ID},
 * 2. aggregateArithmetics fixed as {@link IndicatorAggregateArithmetic#MAX}, will be ignored anyway in runtime
 * 3. criteria fixed as zero length array, will be ignored anyway in runtime
 */
export interface ManualComputeAchievementIndicator extends AchievementIndicator {
	indicatorId: typeof MANUAL_COMPUTE_ACHIEVEMENT_INDICATOR_ID;
	aggregateArithmetic: IndicatorAggregateArithmetic.MAX;
	criteria: [];
}

export enum AchievementTimeRangeType {
	YEAR = 'year',
	MONTH = 'month'
}

export interface Achievement extends Tuple, OptimisticLock {
	achievementId: AchievementId;
	name: string;
	description?: string;
	timeRangeType: AchievementTimeRangeType;
	timeRangeYear: string;
	timeRangeMonth?: string;
	compareWithPreviousTimeRange: boolean;
	finalScoreIsRatio: boolean;
	indicators: Array<AchievementIndicator>;
	pluginIds?: Array<PluginId>;
	tenantId?: TenantId;
}
