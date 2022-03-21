from __future__ import annotations

from typing import Any, Dict, List, Optional, Union

from watchmen_auth import PrincipalService
from watchmen_data_kernel.encryption import Encryptor, find_encryptor, register_encryptor
from watchmen_model.admin import Factor, FactorEncryptMethod, Topic
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


def ask_encryptor(method: Union[FactorEncryptMethod, str], principal_service: PrincipalService) -> Encryptor:
	encryptor = find_encryptor(method)
	if encryptor.should_ask_params():
		key_type = encryptor.get_key_type()
		tenant_id = principal_service.get_tenant_id()
		particular_key = f'{tenant_id}-{key_type}'
		particular_encryptor = find_encryptor(particular_key)
		if particular_encryptor is not None:
			return particular_encryptor
		# to avoid loop dependency
		from watchmen_data_kernel.meta import KeyStoreService
		key_store = KeyStoreService(principal_service).find_by_type(key_type, tenant_id)
		if key_store is None:
			# no special key store declared, use global one
			return encryptor
		else:
			particular_encryptor = encryptor.create_particular(key_store.params)
			register_encryptor(particular_key, particular_encryptor)
			return particular_encryptor
	else:
		return encryptor


class EncryptFactor:
	def __init__(self, factor: Factor):
		self.factor = factor
		self.factorName = '' if is_blank(factor.name) else factor.name.strip()
		self.names = self.factorName.split('.')

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
			.each(lambda x: x.pop_first_name()) \
			.group_by(lambda x: x.names[0])
		self.groups = ArrayHelper(list(groups.items())) \
			.map(lambda x: EncryptFactorGroup(name=x[0], factors=x[1])).to_list()

	def encrypt(self, data: Dict[str, Any], principal_service: PrincipalService) -> None:
		value = data.get(self.name)
		if value is None:
			return
		if isinstance(value, dict):
			ArrayHelper(self.groups).each(lambda x: x.encrypt(value, principal_service))
		elif isinstance(value, list):
			def each(item):
				ArrayHelper(self.groups).each(lambda x: x.encrypt(item, principal_service))

			ArrayHelper(value).each(lambda x: each(x))
		else:
			data[self.name] = encrypt(value, self.factors[0].get_encrypt_method(), principal_service)

	def decrypt(self, data: Dict[str, Any], principal_service: PrincipalService) -> None:
		value = data.get(self.name)
		if value is None:
			return
		if isinstance(value, dict):
			ArrayHelper(self.groups).each(lambda x: x.decrypt(value, principal_service))
		elif isinstance(value, list):
			def each(item):
				ArrayHelper(self.groups).each(lambda x: x.decrypt(item, principal_service))

			ArrayHelper(value).each(lambda x: each(x))
		else:
			data[self.name] = decrypt(value, self.factors[0].get_encrypt_method(), principal_service)


def parse_encrypt_factors(topic: Topic) -> List[EncryptFactorGroup]:
	groups = ArrayHelper(topic.factors) \
		.filter(lambda x: x.encrypt is not None and x.encrypt != FactorEncryptMethod.NONE) \
		.map(lambda x: EncryptFactor(x)) \
		.filter(lambda x: is_not_blank(x.factorName)) \
		.group_by(lambda x: x.names[0])

	return ArrayHelper(list(groups.items())) \
		.map(lambda x: EncryptFactorGroup(name=x[0], factors=x[1])).to_list()


def encrypt(value: Any, method: FactorEncryptMethod, principal_service: PrincipalService) -> Any:
	# do encryption
	# check it is encrypted or not first
	# data read from topic, and write again, might be encrypted already
	if method == FactorEncryptMethod.NONE:
		return value
	else:
		return ask_encryptor(method, principal_service).encrypt(value)


def decrypt(value: Any, method: FactorEncryptMethod, principal_service: PrincipalService) -> Any:
	# do encryption
	# check it is encrypted or not first
	# data read from topic, and write again, might be encrypted already
	if method == FactorEncryptMethod.NONE:
		return value
	else:
		return ask_encryptor(method, principal_service).decrypt(value)
