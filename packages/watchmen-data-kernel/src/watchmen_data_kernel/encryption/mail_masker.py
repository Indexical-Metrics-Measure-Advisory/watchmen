from typing import Any, Union

from watchmen_model.admin import FactorEncryptMethod
from .encryptor import Encryptor


class MailMasker(Encryptor):
	def accept(self, method: Union[FactorEncryptMethod, str]) -> bool:
		return method == FactorEncryptMethod.MASK_MAIL

	def is_encrypted(self, value: Any) -> bool:
		if value is None:
			return False
		elif isinstance(value, str) and value.startswith('*****@'):
			return True
		else:
			return False

	def do_encrypt(self, value: Any) -> Any:
		value = str(value)
		pos = value.find('@')
		if pos > 0:
			return f'*****{value[pos:]}'
		else:
			return value

	def do_decrypt(self, value: str) -> str:
		# mail mask cannot be decrypted
		return value

	def get_key_type(self) -> str:
		return FactorEncryptMethod.MASK_MAIL.value
