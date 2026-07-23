// Rule-code descriptors: which rule codes apply at which grade, and which
// MonitorRuleParameters fields each code consumes.
//
// Grade applicability mirrors the canonical mapping in
// packages/watchmen-web-client/src/services/data/data-quality/rule-types.ts
// (GlobalRuleDefs / TopicRuleDefs / FactorRuleDefs); parameter usage mirrors
// the rule implementations under packages/watchmen-dqc/src/watchmen_dqc/monitor/rule/.
import { MonitorRuleCode, MonitorRuleGrade } from '@/models/monitorRule';

export type RuleParamField =
	| 'statisticalInterval' | 'coverageRate' | 'aggregation' | 'quantile' | 'length'
	| 'max' | 'min' | 'regexp' | 'compareOperator' | 'topicId' | 'factorId';

/** Rule codes available on global grade (web-client GlobalRuleDefs). */
export const GLOBAL_RULE_CODES: MonitorRuleCode[] = [
	MonitorRuleCode.RAW_MISMATCH_STRUCTURE,
	MonitorRuleCode.FACTOR_MISMATCH_TYPE,
	MonitorRuleCode.FACTOR_MISMATCH_ENUM,
	MonitorRuleCode.FACTOR_MISMATCH_DATE_TYPE,
	MonitorRuleCode.ROWS_NOT_EXISTS,
];

/** Rule codes available on topic grade (web-client TopicRuleDefs). */
export const TOPIC_RULE_CODES: MonitorRuleCode[] = [
	MonitorRuleCode.RAW_MISMATCH_STRUCTURE,
	MonitorRuleCode.FACTOR_MISMATCH_TYPE,
	MonitorRuleCode.FACTOR_MISMATCH_ENUM,
	MonitorRuleCode.FACTOR_MISMATCH_DATE_TYPE,
	MonitorRuleCode.ROWS_NOT_EXISTS,
	MonitorRuleCode.ROWS_NO_CHANGE,
	MonitorRuleCode.ROWS_COUNT_MISMATCH_AND_ANOTHER,
];

/** Rule codes available on factor grade (web-client FactorRuleDefs). */
export const FACTOR_RULE_CODES: MonitorRuleCode[] = [
	MonitorRuleCode.FACTOR_MISMATCH_TYPE,
	MonitorRuleCode.FACTOR_MISMATCH_ENUM,
	MonitorRuleCode.FACTOR_MISMATCH_DATE_TYPE,
	MonitorRuleCode.FACTOR_IS_EMPTY,
	MonitorRuleCode.FACTOR_USE_CAST,
	MonitorRuleCode.FACTOR_COMMON_VALUE_OVER_COVERAGE,
	MonitorRuleCode.FACTOR_EMPTY_OVER_COVERAGE,
	MonitorRuleCode.FACTOR_BREAKS_MONOTONE_INCREASING,
	MonitorRuleCode.FACTOR_BREAKS_MONOTONE_DECREASING,
	MonitorRuleCode.FACTOR_NOT_IN_RANGE,
	MonitorRuleCode.FACTOR_MAX_NOT_IN_RANGE,
	MonitorRuleCode.FACTOR_MIN_NOT_IN_RANGE,
	MonitorRuleCode.FACTOR_AVG_NOT_IN_RANGE,
	MonitorRuleCode.FACTOR_MEDIAN_NOT_IN_RANGE,
	MonitorRuleCode.FACTOR_QUANTILE_NOT_IN_RANGE,
	MonitorRuleCode.FACTOR_STDEV_NOT_IN_RANGE,
	MonitorRuleCode.FACTOR_COMMON_VALUE_NOT_IN_RANGE,
	MonitorRuleCode.FACTOR_IS_BLANK,
	MonitorRuleCode.FACTOR_STRING_LENGTH_MISMATCH,
	MonitorRuleCode.FACTOR_STRING_LENGTH_NOT_IN_RANGE,
	MonitorRuleCode.FACTOR_MATCH_REGEXP,
	MonitorRuleCode.FACTOR_MISMATCH_REGEXP,
	MonitorRuleCode.FACTOR_AND_ANOTHER,
];

export const ruleCodesOfGrade = (grade: MonitorRuleGrade): MonitorRuleCode[] => {
	switch (grade) {
		case MonitorRuleGrade.GLOBAL:
			return GLOBAL_RULE_CODES;
		case MonitorRuleGrade.TOPIC:
			return TOPIC_RULE_CODES;
		case MonitorRuleGrade.FACTOR:
			return FACTOR_RULE_CODES;
	}
};

/**
 * Parameter fields consumed by each rule code (beyond `statisticalInterval`,
 * which the rules runner honors for every rule).
 */
const RULE_PARAM_FIELDS: Partial<Record<MonitorRuleCode, RuleParamField[]>> = {
	[MonitorRuleCode.ROWS_NO_CHANGE]: ['coverageRate'],
	[MonitorRuleCode.ROWS_COUNT_MISMATCH_AND_ANOTHER]: ['topicId'],
	[MonitorRuleCode.FACTOR_COMMON_VALUE_OVER_COVERAGE]: ['aggregation', 'coverageRate'],
	[MonitorRuleCode.FACTOR_EMPTY_OVER_COVERAGE]: ['coverageRate'],
	[MonitorRuleCode.FACTOR_NOT_IN_RANGE]: ['min', 'max'],
	[MonitorRuleCode.FACTOR_MAX_NOT_IN_RANGE]: ['min', 'max'],
	[MonitorRuleCode.FACTOR_MIN_NOT_IN_RANGE]: ['min', 'max'],
	[MonitorRuleCode.FACTOR_AVG_NOT_IN_RANGE]: ['min', 'max'],
	[MonitorRuleCode.FACTOR_MEDIAN_NOT_IN_RANGE]: ['min', 'max'],
	[MonitorRuleCode.FACTOR_QUANTILE_NOT_IN_RANGE]: ['quantile', 'min', 'max'],
	[MonitorRuleCode.FACTOR_STDEV_NOT_IN_RANGE]: ['min', 'max'],
	[MonitorRuleCode.FACTOR_COMMON_VALUE_NOT_IN_RANGE]: ['aggregation', 'min', 'max'],
	[MonitorRuleCode.FACTOR_STRING_LENGTH_MISMATCH]: ['length'],
	[MonitorRuleCode.FACTOR_STRING_LENGTH_NOT_IN_RANGE]: ['min', 'max'],
	[MonitorRuleCode.FACTOR_MATCH_REGEXP]: ['regexp'],
	[MonitorRuleCode.FACTOR_MISMATCH_REGEXP]: ['regexp'],
	[MonitorRuleCode.FACTOR_AND_ANOTHER]: ['factorId', 'compareOperator'],
};

export const ruleParamFieldsOf = (code?: MonitorRuleCode): RuleParamField[] => {
	if (!code) return ['statisticalInterval'];
	return ['statisticalInterval', ...(RULE_PARAM_FIELDS[code] ?? [])];
};
