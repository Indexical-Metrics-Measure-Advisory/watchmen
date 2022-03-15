from datetime import date
from typing import Any, List, Union

from watchmen_data_kernel.common import DataKernelException
from watchmen_model.admin import FactorEncryptMethod
from watchmen_utilities import is_date_plus_format
from .encryptor import Encryptor


class DateMasker(Encryptor):
	def __init__(self, month: bool, day: bool, formats: List[str]):
		self.maskMonth = month
		self.maskDay = day
		if month and day:
			self.method = FactorEncryptMethod.MASK_MONTH_DAY
		elif month:
			self.method = FactorEncryptMethod.MASK_MONTH
		elif day:
			self.method = FactorEncryptMethod.MASK_DAY
		else:
			raise DataKernelException(f'At least one of month or day should be masked, current is none.')
		self.formats = formats
		if formats is None or len(formats) == 0:
			raise DataKernelException(f'At least one date format should be provided, current is none.')

	def accept(self, method: Union[FactorEncryptMethod, str]) -> bool:
		return method == self.method

	def is_encrypted(self, value: Any) -> bool:
		"""
		always returns false
		"""
		return False

	def do_encrypt(self, value: Any) -> Any:
		if isinstance(value, date):
			if self.method == FactorEncryptMethod.MASK_MONTH_DAY:
				return value.replace(month=1, day=1)
			elif self.method == FactorEncryptMethod.MASK_MONTH:
				return value.replace(month=1)
			elif self.method == FactorEncryptMethod.MASK_DAY:
				return value.replace(day=1)
			else:
				raise DataKernelException(f'Encrypt method[{self.method}] is not supported.')

		if not isinstance(value, str):
			raise DataKernelException(f'Given value[{value}] is not a string, cannot be masked.')

		parsed, date_value, date_format = is_date_plus_format(value, self.formats)
		if not parsed:
			raise DataKernelException(
				f'Given value[{value}] cannot be parsed to date or datetime by formats[{self.formats}].')
		# call myself to encrypt date
		masked_date = self.do_encrypt(date_value)
		# format to string again, now only decimal included
		formatted_value = masked_date.strftime(date_format)
		# test len, return directly when length is same
		if len(formatted_value) == len(value):
			return formatted_value

		# gather decimal character from formatted, other character from original
		final_value = []
		formatted_value_index = 0
		for ch in value:
			if not ch.isdecimal():
				final_value.append(ch)
			else:
				final_value.append(formatted_value[formatted_value_index])
				formatted_value_index = formatted_value_index + 1
		return ''.join(final_value)

	def do_decrypt(self, value: str) -> str:
		# center mask cannot be decrypted
		return value

	def get_key_type(self) -> str:
		return self.method.value
