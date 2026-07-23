// Monitor rule models — mirror watchmen-model dqc/monitor_rule.py.
// Source: packages/watchmen-model/src/watchmen_model/dqc/monitor_rule.py
// Endpoints: GET/POST /dqc/monitor/rules, GET /dqc/monitor/rules/run
// (packages/watchmen-rest-dqc/.../admin/monitor_rules_router.py, monitor/topic_monitor_router.py)

/** `MonitorRuleCode` enum — the ~30 built-in rule types. */
export enum MonitorRuleCode {
	// structure
	RAW_MISMATCH_STRUCTURE = 'raw-mismatch-structure',

	// type
	FACTOR_MISMATCH_ENUM = 'factor-mismatch-enum',
	FACTOR_MISMATCH_TYPE = 'factor-mismatch-type',
	FACTOR_MISMATCH_DATE_TYPE = 'factor-mismatch-date-type',

	// topic row count
	ROWS_NOT_EXISTS = 'rows-not-exists',
	ROWS_NO_CHANGE = 'rows-no-change',
	ROWS_COUNT_MISMATCH_AND_ANOTHER = 'rows-count-mismatch-and-another',

	// for all factor types
	FACTOR_IS_EMPTY = 'factor-is-empty',
	FACTOR_USE_CAST = 'factor-use-cast',
	FACTOR_COMMON_VALUE_OVER_COVERAGE = 'factor-common-value-over-coverage',
	FACTOR_EMPTY_OVER_COVERAGE = 'factor-empty-over-coverage',

	// for number type
	FACTOR_BREAKS_MONOTONE_INCREASING = 'factor-breaks-monotone-increasing',
	FACTOR_BREAKS_MONOTONE_DECREASING = 'factor-breaks-monotone-decreasing',
	FACTOR_NOT_IN_RANGE = 'factor-not-in-range',
	FACTOR_MAX_NOT_IN_RANGE = 'factor-max-not-in-range',
	FACTOR_MIN_NOT_IN_RANGE = 'factor-min-not-in-range',
	FACTOR_AVG_NOT_IN_RANGE = 'factor-avg-not-in-range',
	FACTOR_MEDIAN_NOT_IN_RANGE = 'factor-median-not-in-range',
	FACTOR_QUANTILE_NOT_IN_RANGE = 'factor-quantile-not-in-range',
	FACTOR_STDEV_NOT_IN_RANGE = 'factor-stdev-not-in-range',
	FACTOR_COMMON_VALUE_NOT_IN_RANGE = 'factor-common-value-not-in-range',

	// for string type
	FACTOR_IS_BLANK = 'factor-is-blank',
	FACTOR_STRING_LENGTH_MISMATCH = 'factor-string-length-mismatch',
	FACTOR_STRING_LENGTH_NOT_IN_RANGE = 'factor-string-length-not-in-range',
	FACTOR_MATCH_REGEXP = 'factor-match-regexp',
	FACTOR_MISMATCH_REGEXP = 'factor-mismatch-regexp',

	// for 2 factors
	FACTOR_AND_ANOTHER = 'factor-and-another',
}

/** `MonitorRuleGrade` enum — the level a rule applies at. */
export enum MonitorRuleGrade {
	GLOBAL = 'global',
	TOPIC = 'topic',
	FACTOR = 'factor',
}

/** `MonitorRuleSeverity` enum. */
export enum MonitorRuleSeverity {
	FATAL = 'fatal',
	WARN = 'warn',
	TRACE = 'trace',
}

/** `MonitorRuleStatisticalInterval` enum. */
export enum MonitorRuleStatisticalInterval {
	DAILY = 'daily',
	WEEKLY = 'weekly',
	MONTHLY = 'monthly',
}

/** `MonitorRuleCompareOperator` enum. */
export enum MonitorRuleCompareOperator {
	EQUAL = 'eq',
	LESS_THAN = 'lt',
	LESS_THAN_OR_EQUAL = 'lte',
	GREATER_THAN = 'gt',
	GREATER_THAN_EQUAL = 'gte',
}

/** `MonitorRuleParameters` model — all fields optional; which ones apply
 * depends on the rule code (see ruleCodeDescriptors.ts). */
export interface MonitorRuleParameters {
	statisticalInterval?: MonitorRuleStatisticalInterval;
	coverageRate?: number;
	aggregation?: number;
	quantile?: number;
	length?: number;
	max?: number;
	min?: number;
	regexp?: string;
	compareOperator?: MonitorRuleCompareOperator;
	topicId?: string;
	factorId?: string;
}

/** `MonitorRule` model (tenant-scoped tuple). */
export interface MonitorRule {
	ruleId?: string;
	code?: MonitorRuleCode;
	grade?: MonitorRuleGrade;
	severity?: MonitorRuleSeverity;
	topicId?: string;
	factorId?: string;
	params?: MonitorRuleParameters;
	enabled?: boolean;
	tenantId?: string;
	version?: number;
}
