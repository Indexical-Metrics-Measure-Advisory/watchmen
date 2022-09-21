from __future__ import annotations

from typing import Any, Dict, List, Optional

from watchmen_data_kernel.common import ask_ignore_default_on_raw
from watchmen_model.admin import Factor, Topic, TopicType
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank
from .utils import cast_value_for_factor

"""
design of default value initializer. same with encryption, see that for more. 
"""


class DefaultValueFactor:
	def __init__(self, factor: Factor):
		self.factor = factor
		self.factorName = '' if is_blank(factor.name) else factor.name.strip()
		self.names = self.factorName.split('.')
		self.defaultValue = cast_value_for_factor(factor.defaultValue, factor)

	def pop_first_name(self):
		self.names = self.names[1:]

	def get_default_value(self):
		return self.defaultValue


class DefaultValueFactorGroup:
	factors: Optional[List[DefaultValueFactor]] = None
	groups: Optional[List[DefaultValueFactorGroup]] = None

	def __init__(self, name: str, factors: List[DefaultValueFactor]):
		self.name = name
		# in reality, zero or one factor.
		# if there is one, name is same as group's, and will not contain group anymore
		self.factors = ArrayHelper(factors).filter(lambda x: len(x.names) == 1).to_list()
		groups = ArrayHelper(factors).filter(lambda x: len(x.names) > 1) \
			.each(lambda x: x.pop_first_name()) \
			.group_by(lambda x: x.names[0])
		self.groups = ArrayHelper(list(groups.items())) \
			.map(lambda x: DefaultValueFactorGroup(name=x[0], factors=x[1])).to_list()

	def set_default_value(self, data: Dict[str, Any]) -> None:
		value = data.get(self.name)
		if isinstance(value, dict):
			ArrayHelper(self.groups).each(lambda x: x.set_default_value(value))
		elif isinstance(value, list):
			def each(item):
				ArrayHelper(self.groups).each(lambda x: x.set_default_value(item))

			ArrayHelper(value).each(lambda x: each(x))
		elif value is None and len(self.factors) == 1:
			data[self.name] = self.factors[0].get_default_value()


def parse_default_value_factors(topic: Topic) -> List[DefaultValueFactorGroup]:
	if topic.type == TopicType.RAW and ask_ignore_default_on_raw():
		return []

	groups = ArrayHelper(topic.factors) \
		.filter(lambda x: x.defaultValue is not None) \
		.map(lambda x: DefaultValueFactor(x)) \
		.filter(lambda x: is_not_blank(x.factorName)) \
		.group_by(lambda x: x.names[0])

	return ArrayHelper(list(groups.items())) \
		.map(lambda x: DefaultValueFactorGroup(name=x[0], factors=x[1])).to_list()
