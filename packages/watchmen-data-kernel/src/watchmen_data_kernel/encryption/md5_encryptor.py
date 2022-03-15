from base64 import b64encode
from hashlib import md5
from typing import Any, Union

from watchmen_model.admin import FactorEncryptMethod
from .encryptor import Encryptor


class MD5Encryptor(Encryptor):
	def accept(self, method: Union[FactorEncryptMethod, str]) -> bool:
		return method == FactorEncryptMethod.MD5

	def is_encrypted(self, value: Any) -> bool:
		if value is None:
			return False
		elif isinstance(value, str) and value.startswith('{MD5}'):
			return True
		else:
			return False

	def do_encrypt(self, value: Any) -> Any:
		value = str(value)
		return b64encode(md5(value.encode('utf-8')).digest()).decode()

	def do_decrypt(self, value: str) -> str:
		# md5 cannot be decrypted, remove prefix only
		return value[5:]

	def get_key_type(self) -> str:
		return FactorEncryptMethod.MD5.value
