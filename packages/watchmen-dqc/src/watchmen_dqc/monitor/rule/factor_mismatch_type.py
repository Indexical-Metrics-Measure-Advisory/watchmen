from datetime import datetime
from typing import Optional, Tuple

from watchmen_data_kernel.storage import TopicDataService
from watchmen_model.admin import Factor, FactorType
from watchmen_model.dqc import MonitorRule
from watchmen_storage import EntityCriteria
from watchmen_utilities import DateTimeConstants
from .data_service_utils import build_date_range_criteria, find_factor, less_than, out_of_range
from .types import RuleResult


def build_mismatch_statement(factor: Factor, data_service: TopicDataService) -> Tuple[bool, Optional[EntityCriteria]]:
	factor_type = factor.type
	if factor_type == FactorType.SEQUENCE:
		return False, None
	elif factor_type == FactorType.NUMBER:
		return False, None
	elif factor_type == FactorType.UNSIGNED:
		return True, [less_than(factor, data_service, 0)]
	elif factor_type == FactorType.TEXT:
		return False, None
	elif factor_type == FactorType.ADDRESS:
		return False, None
	elif factor_type == FactorType.CONTINENT:
		return False, None
	elif factor_type == FactorType.REGION:
		return False, None
	elif factor_type == FactorType.COUNTRY:
		return False, None
	elif factor_type == FactorType.PROVINCE:
		return False, None
	elif factor_type == FactorType.CITY:
		return False, None
	elif factor_type == FactorType.DISTRICT:
		return False, None
	elif factor_type == FactorType.ROAD:
		return False, None
	elif factor_type == FactorType.COMMUNITY:
		return False, None
	elif factor_type == FactorType.FLOOR:
		return False, None
	elif factor_type == FactorType.RESIDENCE_TYPE:
		return False, None
	elif factor_type == FactorType.RESIDENTIAL_AREA:
		return True, [less_than(factor, data_service, 0)]
	elif factor_type == FactorType.EMAIL:
		return False, None
	elif factor_type == FactorType.PHONE:
		return False, None
	elif factor_type == FactorType.MOBILE:
		return False, None
	elif factor_type == FactorType.FAX:
		return False, None
	elif factor_type == FactorType.DATETIME:
		return False, None
	elif factor_type == FactorType.FULL_DATETIME:
		return False, None
	elif factor_type == FactorType.DATE:
		return False, None
	elif factor_type == FactorType.TIME:
		return False, None
	elif factor_type == FactorType.YEAR:
		return True, [out_of_range(factor, data_service, 0, 9999)]
	elif factor_type == FactorType.HALF_YEAR:
		return True, [
			out_of_range(factor, data_service, DateTimeConstants.HALF_YEAR_FIRST, DateTimeConstants.HALF_YEAR_SECOND)
		]
	elif factor_type == FactorType.QUARTER:
		return True, [
			out_of_range(factor, data_service, DateTimeConstants.QUARTER_FIRST, DateTimeConstants.QUARTER_FOURTH)
		]
	elif factor_type == FactorType.MONTH:
		return True, [out_of_range(factor, data_service, DateTimeConstants.JANUARY, DateTimeConstants.DECEMBER)]
	elif factor_type == FactorType.HALF_MONTH:
		return True, [
			out_of_range(factor, data_service, DateTimeConstants.HALF_MONTH_FIRST, DateTimeConstants.HALF_MONTH_SECOND)
		]
	elif factor_type == FactorType.TEN_DAYS:
		return True, [
			out_of_range(factor, data_service, DateTimeConstants.TEN_DAYS_FIRST, DateTimeConstants.TEN_DAYS_THIRD)
		]
	elif factor_type == FactorType.WEEK_OF_YEAR:
		return True, [
			out_of_range(
				factor, data_service,
				DateTimeConstants.WEEK_OF_YEAR_FIRST_SHORT, DateTimeConstants.WEEK_OF_YEAR_LAST)
		]
	elif factor_type == FactorType.WEEK_OF_MONTH:
		return True, [
			out_of_range(
				factor, data_service,
				DateTimeConstants.WEEK_OF_MONTH_FIRST_SHORT, DateTimeConstants.WEEK_OF_MONTH_LAST)
		]
	elif factor_type == FactorType.HALF_WEEK:
		return True, [
			out_of_range(factor, data_service, DateTimeConstants.HALF_WEEK_FIRST, DateTimeConstants.HALF_WEEK_SECOND)
		]
	elif factor_type == FactorType.DAY_OF_MONTH:
		return True, [
			out_of_range(factor, data_service, DateTimeConstants.DAY_OF_MONTH_MIN, DateTimeConstants.DAY_OF_MONTH_MAX)
		]
	elif factor_type == FactorType.DAY_OF_WEEK:
		return True, [
			out_of_range(factor, data_service, DateTimeConstants.SUNDAY, DateTimeConstants.SATURDAY)
		]
	elif factor_type == FactorType.DAY_KIND:
		return True, [
			out_of_range(factor, data_service, DateTimeConstants.DAY_KIND_WORKDAY, DateTimeConstants.DAY_KIND_HOLIDAY)
		]
	elif factor_type == FactorType.HOUR:
		return True, [out_of_range(factor, data_service, 0, 59)]
	elif factor_type == FactorType.HOUR_KIND:
		return True, [
			out_of_range(
				factor, data_service,
				DateTimeConstants.HOUR_KIND_WORKTIME, DateTimeConstants.HOUR_KIND_SLEEPING_TIME)
		]
	elif factor_type == FactorType.MINUTE:
		return True, [out_of_range(factor, data_service, 0, 59)]
	elif factor_type == FactorType.SECOND:
		return True, [out_of_range(factor, data_service, 0, 59)]
	elif factor_type == FactorType.MILLISECOND:
		return True, [out_of_range(factor, data_service, 0, 999)]
	elif factor_type == FactorType.AM_PM:
		return True, [out_of_range(factor, data_service, DateTimeConstants.AM, DateTimeConstants.PM)]
	elif factor_type == FactorType.GENDER:
		return False, None
	elif factor_type == FactorType.OCCUPATION:
		return False, None
	elif factor_type == FactorType.DATE_OF_BIRTH:
		return False, None
	elif factor_type == FactorType.AGE:
		return True, [less_than(factor, data_service, 0)]
	elif factor_type == FactorType.ID_NO:
		return False, None
	elif factor_type == FactorType.RELIGION:
		return False, None
	elif factor_type == FactorType.NATIONALITY:
		return False, None
	elif factor_type == FactorType.BIZ_TRADE:
		return False, None
	elif factor_type == FactorType.BIZ_SCALE:
		return True, [less_than(factor, data_service, 0)]
	elif factor_type == FactorType.BOOLEAN:
		return False, None
	elif factor_type == FactorType.ENUM:
		return False, None
	else:
		return False, None


# noinspection PyUnusedLocal
def factor_mismatch_type(
		data_service: TopicDataService, rule: MonitorRule,
		date_range: Tuple[datetime, datetime],
		changed_rows_count_in_range: int, total_rows_count: int
) -> RuleResult:
	found, factor = find_factor(data_service, rule.factorId, rule)
	if not found:
		return RuleResult.IGNORED

	should, criteria = build_mismatch_statement(factor, data_service)
	if not should:
		# not need to detect, ignored
		return RuleResult.IGNORED

	count = data_service.count_by_criteria([
		*criteria,
		*build_date_range_criteria(date_range)
	])

	return RuleResult.SUCCESS if count == 0 else RuleResult.FAILED
