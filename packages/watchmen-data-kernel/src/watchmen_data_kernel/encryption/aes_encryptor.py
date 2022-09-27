from base64 import b64decode, b64encode
from typing import Any, Dict, Union

from watchmen_data_kernel.common import DataKernelException
from watchmen_model.admin import FactorEncryptMethod
from watchmen_utilities import is_blank, is_empty
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
		if value is None or (isinstance(value, str) and is_empty(value)):
			return value
		value = str(value)
		return '{AES}' + b64encode(self.ask_aes().encrypt(value.encode('utf-8'))).decode()

	def do_decrypt(self, value: str) -> str:
		if is_empty(value):
			return value
		# remove prefix and decrypt
		return self.ask_aes().decrypt(b64decode(value[5:])).decode('utf-8')

	def should_ask_params(self) -> bool:
		return True

	def get_key_type(self) -> str:
		return FactorEncryptMethod.AES256_PKCS5_PADDING.value

	def create_particular(self, params: Dict[str, Any]) -> Encryptor:
		key = params.get('key')
		if is_blank(key) or len(key) != 32:
			raise DataKernelException(f'Parameter key[{key}] should be 32 digits.')
		iv = params.get('iv')
		if is_blank(iv) or len(iv) != 16:
			raise DataKernelException(f'Parameter iv[{iv}] should be 16 digits.')
		return AESEncryptor(key, iv)
