from __future__ import annotations

from datetime import date, time
from typing import Any, Dict, List, Optional, Union

from watchmen_data_kernel.common import ask_all_date_formats, ask_time_formats
from watchmen_data_kernel.common.settings import ask_abandon_date_time_on_parse_fail
from watchmen_model.admin import Factor, FactorType, Topic
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank, try_to_date, try_to_time

"""
design of date/time/datetime translator. same with encryption, see that for more. 
"""


class DateOrTimeFactor:
	def __init__(self, factor: Factor):
		self.factor = factor
		self.factorName = '' if is_blank(factor.name) else factor.name.strip()
		self.names = self.factorName.split('.')

	def pop_first_name(self):
		self.names = self.names[1:]

	def translate(self, value: Any) -> Optional[Union[date, time, Any]]:
		factor_type = self.factor.type
		if factor_type == FactorType.FULL_DATETIME:
			parsed_value = try_to_date(value, ask_all_date_formats())
		elif factor_type == FactorType.DATETIME:
			parsed_value = try_to_date(value, ask_all_date_formats())
		elif factor_type == FactorType.DATE or factor_type == FactorType.DATE_OF_BIRTH:
			parsed_value = try_to_date(value, ask_all_date_formats())
		elif factor_type == FactorType.TIME:
			parsed_value = try_to_time(value, ask_time_formats())
		else:
			parsed_value = value
		if parsed_value is not None:
			return parsed_value
		elif ask_abandon_date_time_on_parse_fail():
			return None
		else:
			return value


class DateOrTimeFactorGroup:
	factors: Optional[List[DateOrTimeFactor]] = None
	groups: Optional[List[DateOrTimeFactorGroup]] = None

	def __init__(self, name: str, factors: List[DateOrTimeFactor]):
		self.name = name
		# in reality, zero or one factor.
		# if there is one, name is same as group's, and will not contain group anymore
		self.factors = ArrayHelper(factors).filter(lambda x: len(x.names) == 1).to_list()
		groups = ArrayHelper(factors).filter(lambda x: len(x.names) > 1) \
			.each(lambda x: x.pop_first_name()) \
			.group_by(lambda x: x.names[0])
		self.groups = ArrayHelper(list(groups.items())) \
			.map(lambda x: DateOrTimeFactorGroup(name=x[0], factors=x[1])).to_list()

	def translate(self, data: Dict[str, Any]) -> None:
		value = data.get(self.name)
		if value is None:
			return
		if isinstance(value, dict):
			ArrayHelper(self.groups).each(lambda x: x.translate(value))
		elif isinstance(value, list):
			def each(item):
				ArrayHelper(self.groups).each(lambda x: x.translate(item))

			ArrayHelper(value).each(lambda x: each(x))
		else:
			data[self.name] = self.factors[0].translate(value)


def is_date_or_time(factor: Factor) -> bool:
	factor_type = factor.type
	return factor_type in [
		FactorType.FULL_DATETIME, FactorType.DATETIME, FactorType.DATE, FactorType.TIME, FactorType.DATE_OF_BIRTH]


def parse_date_or_time_factors(topic: Topic) -> List[DateOrTimeFactorGroup]:
	groups = ArrayHelper(topic.factors) \
		.filter(is_date_or_time) \
		.map(lambda x: DateOrTimeFactor(x)) \
		.filter(lambda x: is_not_blank(x.factorName)) \
		.group_by(lambda x: x.names[0])

	return ArrayHelper(list(groups.items())) \
		.map(lambda x: DateOrTimeFactorGroup(name=x[0], factors=x[1])).to_list()
