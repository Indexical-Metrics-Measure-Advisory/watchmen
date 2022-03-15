from typing import Any, Union

from watchmen_data_kernel.common import DataKernelException
from watchmen_model.admin import FactorEncryptMethod
from .encryptor import Encryptor


class LastMasker(Encryptor):
	def __init__(self, digits: int):
		self.digits = digits
		if digits == 3:
			self.method = FactorEncryptMethod.MASK_LAST_3
		elif digits == 6:
			self.method = FactorEncryptMethod.MASK_LAST_6
		else:
			raise DataKernelException(f'Only 3 or 6 digits last mask is supported, current is [{digits}].')

	def accept(self, method: Union[FactorEncryptMethod, str]) -> bool:
		return method == self.method

	def is_encrypted(self, value: Any) -> bool:
		"""
		always returns false
		"""
		return False

	def do_encrypt(self, value: Any) -> Any:
		value = str(value)
		length = len(value)
		if length <= self.digits:
			# mask all
			return '*' * length
		decimal_count = len([ch for ch in value if ch.isdecimal()])
		if decimal_count < self.digits:
			# there are not enough decimal characters,
			# mask last n characters, no matter what it is
			return f'{value[0:length - self.digits]}{"*" * self.digits}'
		else:
			# mask last n decimal characters
			reversed_value = value[::-1]
			replaced_value = []
			masked_count = 0
			for ch in reversed_value:
				if masked_count < 3 and ch.isdecimal():
					masked_count = masked_count + 1
					replaced_value.append('*')
				else:
					replaced_value.append(ch)
			return ''.join(replaced_value)[::-1]

	def do_decrypt(self, value: str) -> str:
		# center mask cannot be decrypted
		return value

	def get_key_type(self) -> str:
		return self.method.value
