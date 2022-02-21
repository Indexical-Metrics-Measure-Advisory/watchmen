from typing import Any, Union

from watchmen_model.admin import FactorEncryptMethod
from watchmen_reactor.common import ReactorException
from .encryptor import Encryptor


class CenterMasker(Encryptor):
	def __init__(self, digits: int):
		self.digits = digits
		if digits == 3:
			self.method = FactorEncryptMethod.MASK_CENTER_3
		elif digits == 5:
			self.method = FactorEncryptMethod.MASK_CENTER_5
		else:
			raise ReactorException(f'Only 3 or 5 digits center mask is supported, current is [{digits}].')

	def accept(self, method: Union[FactorEncryptMethod, str]) -> bool:
		return method == self.method

	def is_encrypted(self, value: Any) -> bool:
		"""
		always returns false
		"""
		return False

	def do_encrypt(self, value: Any) -> Any:
		value = str(value)
		pos = value.find('@')
		if pos > 0:
			return f'*****{value[pos:]}'
		else:
			return value

	def do_decrypt(self, value: str) -> str:
		# center mask cannot be decrypted
		return value
