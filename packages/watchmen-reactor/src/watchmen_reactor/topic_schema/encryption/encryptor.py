from abc import abstractmethod
from logging import getLogger
from typing import Any, Dict, Optional, Union

from watchmen_model.admin import FactorEncryptMethod
from watchmen_reactor.common import ReactorException

logger = getLogger(__name__)


class Encryptor:
	@abstractmethod
	def accept(self, method: Union[FactorEncryptMethod, str]) -> bool:
		pass

	@abstractmethod
	def is_encrypted(self, value: Any) -> bool:
		pass

	@abstractmethod
	def do_encrypt(self, value: Any) -> Any:
		pass

	def encrypt(self, value: Any) -> Any:
		if value is None:
			return value
		elif isinstance(value, str) and len(value) == 0:
			return value
		elif self.is_encrypted(value):
			return value
		else:
			return self.do_encrypt(value)

	@abstractmethod
	def do_decrypt(self, value: Any) -> Any:
		pass

	def decrypt(self, value: Any) -> Any:
		if value is None:
			return value
		elif isinstance(value, str) and len(value) == 0:
			return value
		elif self.is_encrypted(value):
			return self.do_decrypt(value)
		else:
			return value


class EncryptorRegistry:
	encryptors: Dict[str, Encryptor] = {}

	# noinspection PyMethodMayBeStatic
	def to_key(self, method: Union[FactorEncryptMethod, str]) -> str:
		return method.value if isinstance(method, FactorEncryptMethod) else method

	def register(self, method: Union[FactorEncryptMethod, str], encryptor: Encryptor) -> Optional[Encryptor]:
		key = self.to_key(method)
		original = self.encryptors.get(key)
		self.encryptors[key] = encryptor
		logger.warning(f'Encryptor[{method}] is replaced.')
		return original

	def is_registered(self, method: Union[FactorEncryptMethod, str]) -> bool:
		key = self.to_key(method)
		return key in self.encryptors

	def ask_encryptor(self, method: Union[FactorEncryptMethod, str]) -> Encryptor:
		key = self.to_key(method)
		encryptor = self.encryptors.get(key)
		if encryptor is None:
			raise ReactorException(f'Encryptor[{method}] not found.')
		return encryptor


encryptor_registry = EncryptorRegistry()


def register_encryptor(method: Union[FactorEncryptMethod, str], encryptor: Encryptor) -> None:
	"""
	register writer on startup
	"""
	encryptor_registry.register(method, encryptor)


def is_encryptor_registered(method: Union[FactorEncryptMethod, str]) -> bool:
	return encryptor_registry.is_registered(method)


def ask_encryptor(method: Union[FactorEncryptMethod, str]) -> Encryptor:
	return encryptor_registry.ask_encryptor(method)
