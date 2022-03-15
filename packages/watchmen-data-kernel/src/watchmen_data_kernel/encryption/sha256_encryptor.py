from typing import Any, Union

from watchmen_model.admin import FactorEncryptMethod
from .encryptor import Encryptor


class SHA256Encryptor(Encryptor):
	def accept(self, method: Union[FactorEncryptMethod, str]) -> bool:
		return method == FactorEncryptMethod.SHA256

	def is_encrypted(self, value: Any) -> bool:
		if value is None:
			return False
		elif isinstance(value, str) and value.startswith('{SHA256}'):
			return True
		else:
			return False

	# noinspection PyMethodMayBeStatic
	def ask_sha256(self):
		# lazy load
		# noinspection PyPackageRequirements
		from Crypto.Hash import SHA256
		return SHA256.new()

	def do_encrypt(self, value: Any) -> Any:
		value = str(value)
		sha256 = self.ask_sha256()
		sha256.update(value.encode('utf-8'))
		return sha256.hexdigest()

	def do_decrypt(self, value: str) -> str:
		# sha256 cannot be decrypted, remove prefix only
		return value[8:]

	def get_key_type(self) -> str:
		return FactorEncryptMethod.SHA256.value
