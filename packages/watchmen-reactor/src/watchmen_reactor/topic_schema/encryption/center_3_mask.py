from typing import Any, Union

from watchmen_model.admin import FactorEncryptMethod
from .encryptor import Encryptor


# elif method == FactorEncryptMethod.MASK_CENTER_5:
# elif method == FactorEncryptMethod.MASK_LAST_3:
# elif method == FactorEncryptMethod.MASK_LAST_6:
# elif method == FactorEncryptMethod.MASK_DAY:
# elif method == FactorEncryptMethod.MASK_MONTH:
# elif method == FactorEncryptMethod.MASK_MONTH_DAY:

class Center3Masker(Encryptor):
	def accept(self, method: Union[FactorEncryptMethod, str]) -> bool:
		return method == FactorEncryptMethod.MASK_CENTER_3

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
		# center 3 mask cannot be decrypted
		return value
