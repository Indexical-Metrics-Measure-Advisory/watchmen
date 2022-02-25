from base64 import b64decode, b64encode
from typing import Any, Union

from watchmen_model.admin import FactorEncryptMethod
from .encryptor import Encryptor


class AESEncryptor(Encryptor):
	def __init__(self, key: str, iv: str):
		self.key = key.encode('utf-8')
		self.iv = iv.encode('utf-8')

	def accept(self, method: Union[FactorEncryptMethod, str]) -> bool:
		return method == FactorEncryptMethod.AES256_PKCS5_PADDING

	def is_encrypted(self, value: Any) -> bool:
		if value is None:
			return False
		elif isinstance(value, str) and value.startswith('{AES}'):
			return True
		else:
			return False

	# noinspection PyMethodMayBeStatic
	def ask_aes(self):
		# lazy load
		# noinspection PyPackageRequirements
		from Crypto.Cipher import AES
		return AES.new(self.key, AES.MODE_CFB, self.iv)

	def do_encrypt(self, value: Any) -> Any:
		value = str(value)
		return b64encode(self.ask_aes().encrypt(value.encode('utf-8'))).decode()

	def do_decrypt(self, value: str) -> str:
		# remove prefix and decrypt
		return self.ask_aes().decrypt(b64decode(value[5:])).decode('utf-8')
