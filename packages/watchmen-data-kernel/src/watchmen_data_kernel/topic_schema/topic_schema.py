from __future__ import annotations

from typing import Any, Dict, List

from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import is_raw_topic, Topic
from watchmen_utilities import ArrayHelper
from .aid_hierarchy import aid
from .encrypt_factor import EncryptFactorGroup, parse_encrypt_factors
from .flatten_factor import FlattenFactor, parse_flatten_factors


class TopicSchema:
	def __init__(self, topic: Topic):
		self.topic = topic
		self.flattenFactors = parse_flatten_factors(self.topic)
		self.encryptFactorGroups = parse_encrypt_factors(self.topic)

	def get_topic(self) -> Topic:
		return self.topic

	def get_flatten_factors(self) -> List[FlattenFactor]:
		return self.flattenFactors

	def get_encrypt_factor_groups(self) -> List[EncryptFactorGroup]:
		return self.encryptFactorGroups

	def flatten(self, data: Dict[str, Any]) -> Dict[str, Any]:
		"""
		given data might be changed, and returns exactly the given one
		"""
		if not is_raw_topic(self.get_topic()):
			return data
		ArrayHelper(self.flattenFactors).each(lambda x: x.flatten(data))
		return data

	# noinspection PyMethodMayBeStatic
	def initialize_default_values(self, data: Dict[str, Any]) -> Dict[str, Any]:
		"""
		given data might be changed, and returns exactly the given one
		"""
		# TODO set default values
		return data

	def encrypt(self, data: Dict[str, Any]) -> Dict[str, Any]:
		"""
		given data might be changed, and returns exactly the given one
		"""
		ArrayHelper(self.encryptFactorGroups).each(lambda x: x.encrypt(data))
		return data

	def aid_hierarchy(self, data: Dict[str, Any]) -> Dict[str, Any]:
		"""
		given data might be changed, and returns exactly the given one
		"""
		if not is_raw_topic(self.get_topic()):
			return data

		aid(data, [], ask_snowflake_generator())
		return data

	def prepare_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
		"""
		given data might be changed, and returns exactly the given one
		"""
		data = self.initialize_default_values(data)
		data = self.encrypt(data)
		data = self.aid_hierarchy(data)
		data = self.flatten(data)
		return data
