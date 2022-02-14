from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List

from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import Topic, TopicType
from watchmen_utilities import ArrayHelper
from .aid_hierarchy import aid
from .encrypt_factor import EncryptFactorGroup, parse_encrypt_factors
from .flatten_factor import FlattenFactor, parse_flatten_factors


class ColumnNames(str, Enum):
	ID = 'id_',
	RAW_TOPIC_DATA = 'data_',
	AGGREGATE_ASSIST = 'aggregate_assist_',
	VERSION = 'version_',
	TENANT_ID = 'tenant_id_',
	INSERT_TIME = 'insert_time_',
	UPDATE_TIME = 'update_time_'


class TopicSchema:
	def __init__(self, topic: Topic):
		self.topic = topic
		self.flatten_factors = parse_flatten_factors(self.topic)
		self.encrypt_factor_groups = parse_encrypt_factors(self.topic)

	def get_topic(self) -> Topic:
		return self.topic

	def is_raw_topic(self) -> bool:
		return self.topic.type == TopicType.RAW

	def get_flatten_factors(self) -> List[FlattenFactor]:
		return self.flatten_factors

	def get_encrypt_factor_groups(self) -> List[EncryptFactorGroup]:
		return self.encrypt_factor_groups

	def flatten(self, data: Dict[str, Any]) -> Dict[str, Any]:
		"""
		given data might be changed, and returns exactly the given one
		"""
		if not self.is_raw_topic():
			return data
		ArrayHelper(self.flatten_factors).each(lambda x: x.flatten(data))
		return data

	def encrypt(self, data: Dict[str, Any]) -> Dict[str, Any]:
		"""
		given data might be changed, and returns exactly the given one
		"""
		ArrayHelper(self.encrypt_factor_groups).each(lambda x: x.encrypt(data))
		return data

	def aid_hierarchy(self, data: Dict[str, Any]) -> Dict[str, Any]:
		"""
		given data might be changed, and returns exactly the given one
		"""
		if not self.is_raw_topic():
			return data

		aid(data, [], ask_snowflake_generator())
		return data

	def prepare_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
		"""
		given data might be changed, and returns exactly the given one
		"""
		data = self.encrypt(data)
		data = self.aid_hierarchy(data)
		data = self.flatten(data)
		return data

