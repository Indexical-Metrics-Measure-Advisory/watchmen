// Quality dimensions and scoring for the quality overview band on the run
// statistics screen. Maps monitor rule codes to five classic data-quality
// dimensions and computes dimension/overall scores from enabled rules and
// rule-hit logs. Design: docs/dqc-quality-overview-screen-design.md.
import {
	FactorId
} from '@/services/data/tuples/factor-types';
import {
	MonitorRule,
	MonitorRuleCode,
	MonitorRuleLog,
	MonitorRuleLogs,
	MonitorRuleSeverity,
	MonitorRules,
	MonitorRuleOnFactor,
	MonitorRuleOnTopic
} from '@/services/data/data-quality/rule-types';
import {TopicId} from '@/services/data/tuples/topic-types';
import {isRuleOnFactor, isRuleOnTopic} from '@/services/data/data-quality/rules';

/** The five quality dimensions shown on the radar. */
export enum QualityDimension {
	COMPLETENESS = 'completeness',
	ACCURACY = 'accuracy',
	VALIDITY = 'validity',
	CONSISTENCY = 'consistency',
	TIMELINESS = 'timeliness'
}

export type DimensionOrOther = QualityDimension | 'other';

export const DIMENSION_LABELS: Record<DimensionOrOther, string> = {
	completeness: 'Completeness',
	accuracy: 'Accuracy',
	validity: 'Validity',
	consistency: 'Consistency',
	timeliness: 'Timeliness',
	other: 'Other'
};

/** Rule code -> dimension. Codes absent here (none today) fall into 'other'. */
const DIMENSION_OF_CODE: Partial<Record<MonitorRuleCode, QualityDimension>> = {
	// completeness
	[MonitorRuleCode.ROWS_NOT_EXISTS]: QualityDimension.COMPLETENESS,
	[MonitorRuleCode.FACTOR_IS_EMPTY]: QualityDimension.COMPLETENESS,
	[MonitorRuleCode.FACTOR_IS_BLANK]: QualityDimension.COMPLETENESS,
	[MonitorRuleCode.FACTOR_EMPTY_OVER_COVERAGE]: QualityDimension.COMPLETENESS,
	// accuracy
	[MonitorRuleCode.FACTOR_NOT_IN_RANGE]: QualityDimension.ACCURACY,
	[MonitorRuleCode.FACTOR_MAX_NOT_IN_RANGE]: QualityDimension.ACCURACY,
	[MonitorRuleCode.FACTOR_MIN_NOT_IN_RANGE]: QualityDimension.ACCURACY,
	[MonitorRuleCode.FACTOR_AVG_NOT_IN_RANGE]: QualityDimension.ACCURACY,
	[MonitorRuleCode.FACTOR_MEDIAN_NOT_IN_RANGE]: QualityDimension.ACCURACY,
	[MonitorRuleCode.FACTOR_QUANTILE_NOT_IN_RANGE]: QualityDimension.ACCURACY,
	[MonitorRuleCode.FACTOR_STDEV_NOT_IN_RANGE]: QualityDimension.ACCURACY,
	[MonitorRuleCode.FACTOR_COMMON_VALUE_NOT_IN_RANGE]: QualityDimension.ACCURACY,
	[MonitorRuleCode.FACTOR_COMMON_VALUE_OVER_COVERAGE]: QualityDimension.ACCURACY,
	[MonitorRuleCode.FACTOR_BREAKS_MONOTONE_INCREASING]: QualityDimension.ACCURACY,
	[MonitorRuleCode.FACTOR_BREAKS_MONOTONE_DECREASING]: QualityDimension.ACCURACY,
	// validity
	[MonitorRuleCode.FACTOR_MISMATCH_TYPE]: QualityDimension.VALIDITY,
	[MonitorRuleCode.FACTOR_MISMATCH_ENUM]: QualityDimension.VALIDITY,
	[MonitorRuleCode.FACTOR_MISMATCH_DATE_TYPE]: QualityDimension.VALIDITY,
	[MonitorRuleCode.FACTOR_USE_CAST]: QualityDimension.VALIDITY,
	[MonitorRuleCode.FACTOR_MATCH_REGEXP]: QualityDimension.VALIDITY,
	[MonitorRuleCode.FACTOR_MISMATCH_REGEXP]: QualityDimension.VALIDITY,
	[MonitorRuleCode.FACTOR_STRING_LENGTH_MISMATCH]: QualityDimension.VALIDITY,
	[MonitorRuleCode.FACTOR_STRING_LENGTH_NOT_IN_RANGE]: QualityDimension.VALIDITY,
	// consistency
	[MonitorRuleCode.RAW_MISMATCH_STRUCTURE]: QualityDimension.CONSISTENCY,
	[MonitorRuleCode.ROWS_COUNT_MISMATCH_AND_ANOTHER]: QualityDimension.CONSISTENCY,
	[MonitorRuleCode.FACTOR_AND_ANOTHER]: QualityDimension.CONSISTENCY,
	// timeliness
	[MonitorRuleCode.ROWS_NO_CHANGE]: QualityDimension.TIMELINESS
};

export const dimensionOfCode = (code?: MonitorRuleCode): DimensionOrOther => {
	return (code ? DIMENSION_OF_CODE[code] : (void 0)) ?? 'other';
};

/** Weight of a hit rule by its severity (higher = more score lost). */
export const SEVERITY_WEIGHTS: Record<MonitorRuleSeverity, number> = {
	[MonitorRuleSeverity.FATAL]: 8,
	[MonitorRuleSeverity.WARN]: 3,
	[MonitorRuleSeverity.TRACE]: 1
};

/** Severity assumed for hit logs whose rule no longer exists. */
const DEFAULT_SEVERITY_OF_CODE: Partial<Record<MonitorRuleCode, MonitorRuleSeverity>> = {
	[MonitorRuleCode.ROWS_NOT_EXISTS]: MonitorRuleSeverity.FATAL
};

const fallbackSeverityOf = (code?: MonitorRuleCode): MonitorRuleSeverity => {
	return (code ? DEFAULT_SEVERITY_OF_CODE[code] : (void 0)) || MonitorRuleSeverity.WARN;
};

const weightOf = (severity?: MonitorRuleSeverity): number => {
	return SEVERITY_WEIGHTS[severity ?? MonitorRuleSeverity.WARN] ?? SEVERITY_WEIGHTS[MonitorRuleSeverity.WARN];
};

const scopeOf = (rule: MonitorRule): { topicId?: TopicId; factorId?: FactorId } => {
	if (isRuleOnFactor(rule)) {
		return {topicId: (rule as MonitorRuleOnFactor).topicId, factorId: (rule as MonitorRuleOnFactor).factorId};
	}
	if (isRuleOnTopic(rule)) {
		return {topicId: (rule as MonitorRuleOnTopic).topicId};
	}
	return {};
};

/** A rule matches a hit log when code, topic and factor all agree; rules without
 * topic/factor scope (global grade) match logs from any topic/factor. */
const ruleMatchesLog = (rule: MonitorRule, log: MonitorRuleLog): boolean => {
	const scope = scopeOf(rule);
	return rule.code === log.ruleCode
		&& (!scope.topicId || scope.topicId === log.topicId)
		&& (!scope.factorId || scope.factorId === log.factorId);
};

const SEVERITY_RANK: Record<string, number> = {
	[MonitorRuleSeverity.FATAL]: 0,
	[MonitorRuleSeverity.WARN]: 1,
	[MonitorRuleSeverity.TRACE]: 2
};

/** One alert = a hit log joined to the most specific rule carrying its severity. */
export interface AlertItem {
	ruleCode: MonitorRuleCode;
	topicId?: TopicId;
	factorId?: FactorId;
	count: number;
	lastOccurredTime: string;
	severity: MonitorRuleSeverity;
}

export interface DimensionScore {
	dimension: QualityDimension;
	/** null = the dimension has no enabled rules (excluded from the overall score). */
	score: number | null;
	penaltyWeight: number;
	totalWeight: number;
}

export type ScoreBand = 'excellent' | 'good' | 'fair' | 'poor';

export interface QualityScore {
	/** null = no enabled rules across scored dimensions. */
	score: number | null;
	band: ScoreBand | null;
	dimensions: Array<DimensionScore>;
}

const round1 = (value: number): number => Math.round(value * 10) / 10;

const bandOf = (score: number): ScoreBand => {
	if (score >= 90) {
		return 'excellent';
	} else if (score >= 75) {
		return 'good';
	} else if (score >= 60) {
		return 'fair';
	} else {
		return 'poor';
	}
};

const ALL_DIMENSIONS = [
	QualityDimension.COMPLETENESS,
	QualityDimension.ACCURACY,
	QualityDimension.VALIDITY,
	QualityDimension.CONSISTENCY,
	QualityDimension.TIMELINESS
];

/**
 * Compute dimension and overall quality scores.
 * A rule instance that has hits in the window loses score proportionally to its
 * severity weight; dimension score = 100 x (1 - penalty weight / total weight).
 * Orphan logs (rule deleted) count into both sides with a fallback severity so a
 * stale log cannot drag a dimension to 0.
 */
export const computeQualityScore = (rules: MonitorRules, logs: MonitorRuleLogs): QualityScore => {
	const hitLogs = logs.filter(log => log.count > 0);
	const penalty = new Map<QualityDimension, number>();
	const total = new Map<QualityDimension, number>();
	const scored = (dimension: DimensionOrOther): dimension is QualityDimension => dimension !== 'other';

	for (const rule of rules) {
		if (!rule.enabled) {
			continue;
		}
		const dimension = dimensionOfCode(rule.code);
		if (!scored(dimension)) {
			continue;
		}
		const weight = weightOf(rule.severity);
		total.set(dimension, (total.get(dimension) ?? 0) + weight);
		if (hitLogs.some(log => ruleMatchesLog(rule, log))) {
			penalty.set(dimension, (penalty.get(dimension) ?? 0) + weight);
		}
	}

	// Orphan logs: hits that no longer match any enabled rule — weight them in on
	// both sides so removed rules do not zero out a dimension.
	for (const log of hitLogs) {
		if (rules.some(rule => rule.enabled && ruleMatchesLog(rule, log))) {
			continue;
		}
		const dimension = dimensionOfCode(log.ruleCode);
		if (!scored(dimension)) {
			continue;
		}
		const weight = weightOf(fallbackSeverityOf(log.ruleCode));
		total.set(dimension, (total.get(dimension) ?? 0) + weight);
		penalty.set(dimension, (penalty.get(dimension) ?? 0) + weight);
	}

	const dimensions: Array<DimensionScore> = ALL_DIMENSIONS.map(dimension => {
		const totalWeight = total.get(dimension) ?? 0;
		const penaltyWeight = penalty.get(dimension) ?? 0;
		return {
			dimension,
			penaltyWeight,
			totalWeight,
			score: totalWeight > 0 ? round1(100 * (1 - penaltyWeight / totalWeight)) : null
		};
	});

	const scoredValues = dimensions.map(d => d.score).filter(score => score !== null) as Array<number>;
	const score = scoredValues.length > 0 ? round1(scoredValues.reduce((a, b) => a + b, 0) / scoredValues.length) : null;
	return {score, band: score !== null ? bandOf(score) : null, dimensions};
};

/** Hit logs ranked as alerts: fatal first, then by hit count. */
export const computeAlerts = (rules: MonitorRules, logs: MonitorRuleLogs): Array<AlertItem> => {
	const alerts = logs
		.filter(log => log.count > 0)
		.map((log): AlertItem => {
			// Most specific rule wins: factor rule > topic rule > global rule.
			let specificity = -1;
			let severity: MonitorRuleSeverity | undefined;
			for (const rule of rules) {
				if (!rule.enabled || !ruleMatchesLog(rule, log)) {
					continue;
				}
				const scope = scopeOf(rule);
				const rank = (scope.factorId ? 2 : 0) + (scope.topicId ? 1 : 0);
				if (rank > specificity) {
					specificity = rank;
					severity = rule.severity;
				}
			}
			return {
				ruleCode: log.ruleCode,
				topicId: log.topicId,
				factorId: log.factorId,
				count: log.count,
				lastOccurredTime: log.lastOccurredTime,
				severity: severity ?? fallbackSeverityOf(log.ruleCode)
			};
		});
	return alerts.sort((a, b) => {
		const bySeverity = (SEVERITY_RANK[a.severity] ?? 1) - (SEVERITY_RANK[b.severity] ?? 1);
		return bySeverity !== 0 ? bySeverity : b.count - a.count;
	});
};

/** Enabled-rule count per dimension (pie: coverage share). */
export const rulesByDimension = (rules: MonitorRules): Array<{ dimension: DimensionOrOther; count: number }> => {
	const byDimension = new Map<DimensionOrOther, number>();
	for (const rule of rules) {
		if (!rule.enabled) {
			continue;
		}
		const dimension = dimensionOfCode(rule.code);
		byDimension.set(dimension, (byDimension.get(dimension) ?? 0) + 1);
	}
	return Array.from(byDimension.entries()).map(([dimension, count]) => ({dimension, count}));
};
