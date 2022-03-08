from enum import Enum
from typing import Optional, TypeVar, Union

from pydantic import BaseModel

from watchmen_model.common import DataModel, FactorId, TenantBasedTuple, TopicId

MonitorRuleId = TypeVar('MonitorRuleId', bound=str)


class MonitorRuleCode(str, Enum):
	# structure
	RAW_MISMATCH_STRUCTURE = 'raw-mismatch-structure',

	# type
	FACTOR_MISMATCH_ENUM = 'factor-mismatch-enum',
	FACTOR_MISMATCH_TYPE = 'factor-mismatch-type',
	FACTOR_MISMATCH_DATE_TYPE = 'factor-mismatch-date-type',

	# topic row count
	ROWS_NOT_EXISTS = 'rows-not-exists',
	ROWS_NO_CHANGE = 'rows-no-change',
	ROWS_COUNT_MISMATCH_AND_ANOTHER = 'rows-count-mismatch-and-another',

	# for all factor types
	FACTOR_IS_EMPTY = 'factor-is-empty',
	FACTOR_USE_CAST = 'factor-use-cast',
	FACTOR_COMMON_VALUE_OVER_COVERAGE = 'factor-common-value-over-coverage',
	FACTOR_EMPTY_OVER_COVERAGE = 'factor-empty-over-coverage',

	# for number type
	FACTOR_BREAKS_MONOTONE_INCREASING = 'factor-breaks-monotone-increasing',
	FACTOR_BREAKS_MONOTONE_DECREASING = 'factor-breaks-monotone-decreasing',
	FACTOR_NOT_IN_RANGE = 'factor-not-in-range',
	FACTOR_MAX_NOT_IN_RANGE = 'factor-max-not-in-range',
	FACTOR_MIN_NOT_IN_RANGE = 'factor-min-not-in-range',
	FACTOR_AVG_NOT_IN_RANGE = 'factor-avg-not-in-range',
	FACTOR_MEDIAN_NOT_IN_RANGE = 'factor-median-not-in-range',
	FACTOR_QUANTILE_NOT_IN_RANGE = 'factor-quantile-not-in-range',
	# noinspection SpellCheckingInspection
	FACTOR_STDEV_NOT_IN_RANGE = 'factor-stdev-not-in-range',
	FACTOR_COMMON_VALUE_NOT_IN_RANGE = 'factor-common-value-not-in-range',

	# for string type
	FACTOR_IS_BLANK = 'factor-is-blank',
	FACTOR_STRING_LENGTH_MISMATCH = 'factor-string-length-mismatch',
	FACTOR_STRING_LENGTH_NOT_IN_RANGE = 'factor-string-length-not-in-range',
	FACTOR_MATCH_REGEXP = 'factor-match-regexp',
	FACTOR_MISMATCH_REGEXP = 'factor-mismatch-regexp',

	# for 2 factors
	FACTOR_AND_ANOTHER = 'factor-and-another'


class MonitorRuleGrade(str, Enum):
	GLOBAL = 'global',
	TOPIC = 'topic',
	FACTOR = 'factor'


class MonitorRuleSeverity(str, Enum):
	FATAL = 'fatal',
	WARN = 'warn',
	TRACE = 'trace',


class MonitorRuleStatisticalInterval(str, Enum):
	DAILY = 'daily',
	WEEKLY = 'weekly',
	MONTHLY = 'monthly'


class MonitorRuleCompareOperator(str, Enum):
	EQUAL = 'eq',
	LESS_THAN = 'lt',
	LESS_THAN_OR_EQUAL = 'lte',
	GREATER_THAN = 'gt',
	GREATER_THAN_EQUAL = 'gte'


class MonitorRuleParameters(DataModel, BaseModel):
	statisticalInterval: MonitorRuleStatisticalInterval = None
	coverageRate: int = None
	aggregation: int = None
	quantile: int = None
	length: int = None
	max: int = None
	min: int = None
	regexp: str = None
	compareOperator: MonitorRuleCompareOperator = None
	topicId: Optional[TopicId] = None
	factorId: Optional[FactorId] = None


def construct_params(params: Optional[Union[dict, MonitorRuleParameters]]) -> Optional[MonitorRuleParameters]:
	if params is None:
		return None
	elif isinstance(params, MonitorRuleParameters):
		return params
	else:
		return MonitorRuleParameters(**params)


class MonitorRule(TenantBasedTuple, BaseModel):
	ruleId: MonitorRuleId = None
	code: MonitorRuleCode = None
	grade: MonitorRuleGrade = None
	severity: MonitorRuleSeverity = None
	topicId: TopicId = None
	factorId: Optional[FactorId] = None
	params: MonitorRuleParameters = None
	enabled: bool = False

	def __setattr__(self, name, value):
		if name == 'params':
			super().__setattr__(name, construct_params(value))
		else:
			super().__setattr__(name, value)
