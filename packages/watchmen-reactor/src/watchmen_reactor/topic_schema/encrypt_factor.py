from __future__ import annotations

from typing import Any, Dict, List, Optional

from watchmen_model.admin import Factor, FactorEncryptMethod, Topic
from watchmen_reactor.topic_schema.encryption import ask_encryptor
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank

"""
design of encryption.
looping by encrypt methods, leads unnecessary visits of raw topic hierarchy. for this reason, encrypt methods are 
parsed to groups.
for example, here are several properties need to be encrypted:
1. a,
2. b.c,
3. b.d,
4. b.e.f.g.h.i
5. b.e.f.g.h.j
looping by methods, leads unnecessary visits on "b" and "b.e.f.g.h" (one time for each in this case). 
if there are array and many items, may cause performance issues.
now methods will be parsed to:
1. group "a"
	1.1 factor "a"
2. group "b"
	2.1 group "c"
		2.1.1 factor "c"
	2.2 group "d"
		2.2.1 factor "d"
	2.3 group "e"
		2.3.1 group "f"
			2.3.1.1 group "g"
				2.3.1.1.1 group "h"
					2.3.1.1.1.1 factor "i"
					2.3.1.1.1.2 factor "j"
now, loop by groups, there is no duplicated visit anymore.
"""


class EncryptFactor:
	def __init__(self, factor: Factor):
		self.factor = factor
		self.factor_name = '' if is_blank(factor.name) else factor.name.strip()
		self.names = self.factor_name.split('.')

	def pop_first_name(self):
		self.names = self.names[1:]

	def get_encrypt_method(self):
		return self.factor.encrypt


class EncryptFactorGroup:
	factors: Optional[List[EncryptFactor]] = None
	groups: Optional[List[EncryptFactorGroup]] = None

	def __init__(self, name: str, factors: List[EncryptFactor]):
		self.name = name
		# in reality, zero or one factor.
		# if there is one, name is same as group's, and will not contain group anymore
		self.factors = ArrayHelper(factors).filter(lambda x: len(x.names) == 1).to_list()
		groups = ArrayHelper(factors).filter(lambda x: len(x.names) > 1) \
			.map(lambda x: x.pop_first_name()) \
			.group_by(lambda x: x.names[0])
		self.groups = ArrayHelper(list(groups.items())) \
			.map(lambda x: EncryptFactorGroup(name=x[0], factors=x[1])).to_list()

	def encrypt(self, data: Dict[str, Any]) -> None:
		value = data.get(self.name)
		if value is None:
			return
		if isinstance(value, dict):
			ArrayHelper(self.groups).each(lambda x: x.encrypt(value))
		elif isinstance(value, list):
			def each(item):
				ArrayHelper(self.groups).each(lambda x: x.encrypt(item))

			ArrayHelper(value).each(lambda x: each(x))
		else:
			data[self.name] = encrypt(value, self.factors[0].get_encrypt_method())


def parse_encrypt_factors(topic: Topic) -> List[EncryptFactorGroup]:
	groups = ArrayHelper(topic.factors) \
		.filter(lambda x: x.encrypt is not None and x.encrypt != FactorEncryptMethod.NONE) \
		.map(lambda x: EncryptFactor(x)) \
		.filter(lambda x: is_not_blank(x.factor_name)) \
		.group_by(lambda x: x.names[0])

	return ArrayHelper(list(groups.items())) \
		.map(lambda x: EncryptFactorGroup(name=x[0], factors=x[1])).to_list()


def encrypt(value: Any, method: FactorEncryptMethod) -> Any:
	# do encryption
	# check it is encrypted or not first
	# data read from topic, and write again, might be encrypted already
	if method == FactorEncryptMethod.NONE:
		return value
	else:
		return ask_encryptor(method).encrypt(value)
