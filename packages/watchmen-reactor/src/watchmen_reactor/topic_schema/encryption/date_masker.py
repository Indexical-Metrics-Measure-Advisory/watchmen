from datetime import date
from typing import Any, List, Union

from watchmen_model.admin import FactorEncryptMethod
from watchmen_reactor.common import ReactorException
from watchmen_utilities import is_date
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
			raise ReactorException(f'At least one of month or day should be masked, current is none.')
		self.formats = formats
		if formats is None or len(formats) == 0:
			raise ReactorException(f'At least one date format should be provided, current is none.')

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
				raise ReactorException(f'Encrypt method[{self.method}] is not supported.')

		if not isinstance(value, str):
			raise ReactorException(f'Given value[{value}] is not a string, cannot be masked.')

		parsed, date_value = is_date(value, self.formats)
		if not parsed:
			raise ReactorException(
				f'Given value[{value}] cannot be parsed to date or datetime by formats[{self.formats}].')
		masked_date = self.do_encrypt(date_value)

	def do_decrypt(self, value: str) -> str:
		# center mask cannot be decrypted
		return value
