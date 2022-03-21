from __future__ import annotations

from typing import Any, Dict, List

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import is_raw_topic, Topic, TopicKind
from watchmen_utilities import ArrayHelper
from .aid_hierarchy import aid
from .date_time_factor import parse_date_or_time_factors
from .default_value_factor import DefaultValueFactorGroup, parse_default_value_factors
from .encrypt_factor import EncryptFactorGroup, parse_encrypt_factors
from .flatten_factor import FlattenFactor, parse_flatten_factors


class TopicSchema:
	def __init__(self, topic: Topic):
		self.topic = topic
		self.flattenFactors = parse_flatten_factors(self.topic)
		self.dateOrTimeFactors = parse_date_or_time_factors(self.topic)
		self.encryptFactorGroups = parse_encrypt_factors(self.topic)
		self.defaultValueFactorGroups = parse_default_value_factors(self.topic)

	def get_topic(self) -> Topic:
		return self.topic

	def get_flatten_factors(self) -> List[FlattenFactor]:
		return self.flattenFactors

	def get_encrypt_factor_groups(self) -> List[EncryptFactorGroup]:
		return self.encryptFactorGroups

	def get_default_value_groups(self) -> List[DefaultValueFactorGroup]:
		return self.defaultValueFactorGroups

	def flatten(self, data: Dict[str, Any]) -> Dict[str, Any]:
		"""
		given data might be changed, and returns exactly the given one
		"""
		if not is_raw_topic(self.get_topic()):
			return data
		ArrayHelper(self.flattenFactors).each(lambda x: x.flatten(data))
		return data

	def should_initialize_default_values(self) -> bool:
		return self.get_topic().name not in ['raw_pipeline_monitor_log']

	def initialize_default_values(self, data: Dict[str, Any]) -> Dict[str, Any]:
		"""
		given data might be changed, and returns exactly the given one
		"""
		if self.should_initialize_default_values():
			ArrayHelper(self.defaultValueFactorGroups).each(lambda x: x.set_default_value(data))
		return data

	def cast_date_or_time(self, data: Dict[str, Any]) -> Dict[str, Any]:
		ArrayHelper(self.dateOrTimeFactors).each(lambda x: x.translate(data))
		return data

	def should_encrypt(self) -> bool:
		return self.get_topic().kind != TopicKind.SYSTEM

	def encrypt(self, data: Dict[str, Any], principal_service: PrincipalService) -> Dict[str, Any]:
		"""
		given data might be changed, and returns exactly the given one
		"""
		if self.should_encrypt():
			ArrayHelper(self.encryptFactorGroups).each(lambda x: x.encrypt(data, principal_service))
		return data

	def decrypt(self, data: Dict[str, Any], principal_service: PrincipalService) -> Dict[str, Any]:
		"""
		given data might be changed, and returns exactly the given one
		"""
		if self.should_encrypt():
			ArrayHelper(self.encryptFactorGroups).each(lambda x: x.decrypt(data, principal_service))
		return data

	def should_aid_hierarchy(self) -> bool:
		topic = self.get_topic()
		if not is_raw_topic(topic):
			return False

		if topic.name in ['raw_pipeline_monitor_log']:
			return False

		return True

	def aid_hierarchy(self, data: Dict[str, Any]) -> Dict[str, Any]:
		"""
		given data might be changed, and returns exactly the given one
		"""
		if self.should_aid_hierarchy():
			aid(data, [], ask_snowflake_generator())
		return data

	def prepare_data(self, data: Dict[str, Any], principal_service: PrincipalService) -> Dict[str, Any]:
		"""
		given data might be changed, and returns exactly the given one
		"""
		data = self.initialize_default_values(data)
		data = self.cast_date_or_time(data)
		data = self.encrypt(data, principal_service)
		data = self.aid_hierarchy(data)
		data = self.flatten(data)
		return data
