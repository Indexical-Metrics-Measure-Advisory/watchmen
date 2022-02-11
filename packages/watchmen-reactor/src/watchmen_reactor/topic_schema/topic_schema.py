from __future__ import annotations

from typing import Any, Dict, List

from watchmen_model.admin import Factor, FactorEncryptMethod, Topic, TopicType
from watchmen_utilities import ArrayHelper, is_blank
from .aid_hierarchy import aid


class FlattenFactor:
	def __init__(self, factor: Factor):
		self.factor = factor
		self.factor_name = '' if is_blank(factor.name) else factor.name.strip()
		self.names = self.factor_name.split('.')

	def get_factor(self):
		return self.factor

	def get_names(self):
		return self.names

	def flatten(self, root: Dict[str, Any]) -> Any:
		data = root
		value = None
		for name in self.names:
			value = data.get(name)
			if value is None:
				# break and set to root
				root[self.factor_name] = None
				return None
			else:
				data = value
		# set to root
		root[self.factor_name] = value
		return value


class EncryptFactor:
	def __init__(self, factor: Factor):
		self.factor = factor
		self.factor_name = '' if is_blank(factor.name) else factor.name.strip()
		self.names = self.factor_name.split('.')

	def encrypt(self, root: Dict[str, Any]) -> None:
		# TODO
		pass


def parse_flatten_factors(topic: Topic) -> List[FlattenFactor]:
	return ArrayHelper(topic.factors).filter(lambda x: x.flatten).map(lambda x: FlattenFactor(x)).to_list()


def parse_encrypt_factors(topic: Topic) -> List[EncryptFactor]:
	return ArrayHelper(topic.factors) \
		.filter(lambda x: x.encrypt is not None and x.encrypt != FactorEncryptMethod.NONE) \
		.map(lambda x: EncryptFactor(x)).to_list()


class TopicSchema:
	def __init__(self, topic: Topic):
		self.topic = topic
		self.flatten_factors = parse_flatten_factors(self.topic)
		self.encrypt_factors = parse_encrypt_factors(self.topic)

	def get_topic(self) -> Topic:
		return self.topic

	def is_raw_topic(self) -> bool:
		return self.topic.type == TopicType.RAW

	def get_flatten_factors(self) -> List[FlattenFactor]:
		return self.flatten_factors

	def get_encrypt_factors(self) -> List[EncryptFactor]:
		return self.encrypt_factors

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
		ArrayHelper(self.encrypt_factors).each(lambda x: x.encrypt(data))
		return data

	def aid_hierarchy(self, data: Dict[str, Any]) -> Dict[str, Any]:
		"""
		given data might be changed, and returns exactly the given one
		"""
		if not self.is_raw_topic():
			return data

		aid(data)
		return data

	def prepare_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
		"""
		given data might be changed, and returns exactly the given one
		"""
		data = self.encrypt(data)
		data = self.aid_hierarchy(data)
		data = self.flatten(data)
		return data
