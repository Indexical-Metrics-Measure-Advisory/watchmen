from __future__ import annotations

from abc import abstractmethod
from typing import Any, Dict, Union

from watchmen_data_kernel.common import DataKernelException
from watchmen_model.admin import FactorEncryptMethod


class Encryptor:
	@abstractmethod
	def accept(self, method: Union[FactorEncryptMethod, str]) -> bool:
		pass

	@abstractmethod
	def is_encrypted(self, value: Any) -> bool:
		"""
		value never be none or empty string
		"""
		pass

	@abstractmethod
	def do_encrypt(self, value: Any) -> Any:
		"""
		value never be none or empty string
		"""
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
		"""
		value never be none or empty string
		"""
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

	# noinspection PyMethodMayBeStatic
	def should_ask_params(self) -> bool:
		return False

	@abstractmethod
	def get_key_type(self) -> str:
		pass

	def create_particular(self, params: Dict[str, Any]) -> Encryptor:
		raise DataKernelException('Method[create_particular] is not implemented on key type[{self.get_key_type()}].')
