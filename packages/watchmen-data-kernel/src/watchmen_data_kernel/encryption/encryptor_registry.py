from logging import getLogger
from typing import Dict, Optional, Union

from watchmen_data_kernel.common import ask_all_date_formats, ask_encrypt_aes_params
from watchmen_model.admin import FactorEncryptMethod
from .aes_encryptor import AESEncryptor
from .center_masker import CenterMasker
from .date_masker import DateMasker
from .encryptor import Encryptor
from .last_masker import LastMasker
from .mail_masker import MailMasker
from .md5_encryptor import MD5Encryptor
from .sha256_encryptor import SHA256Encryptor

logger = getLogger(__name__)


class EncryptorRegistry:
	encryptors: Dict[str, Encryptor] = {}

	# noinspection PyMethodMayBeStatic
	def to_key(self, method: Union[FactorEncryptMethod, str]) -> str:
		return method.value if isinstance(method, FactorEncryptMethod) else method

	def register(self, method: Union[FactorEncryptMethod, str], encryptor: Encryptor) -> Optional[Encryptor]:
		key = self.to_key(method)
		original = self.encryptors.get(key)
		self.encryptors[key] = encryptor
		if original is not None:
			logger.warning(f'Encryptor[{method}] is replaced.')
		else:
			logger.info(f'Encryptor[{method}] is registered.')
		return original

	def is_registered(self, method: Union[FactorEncryptMethod, str]) -> bool:
		key = self.to_key(method)
		return key in self.encryptors

	def ask_encryptor(self, method: Union[FactorEncryptMethod, str]) -> Optional[Encryptor]:
		key = self.to_key(method)
		return self.encryptors.get(key)


encryptor_registry = EncryptorRegistry()


def register_encryptor(method: Union[FactorEncryptMethod, str], encryptor: Encryptor) -> None:
	"""
	register writer on startup
	"""
	encryptor_registry.register(method, encryptor)


def is_encryptor_registered(method: Union[FactorEncryptMethod, str]) -> bool:
	return encryptor_registry.is_registered(method)


def find_encryptor(method: Union[FactorEncryptMethod, str]) -> Optional[Encryptor]:
	return encryptor_registry.ask_encryptor(method)


# register default
aes_key, aes_iv = ask_encrypt_aes_params()
register_encryptor(FactorEncryptMethod.AES256_PKCS5_PADDING, AESEncryptor(key=aes_key, iv=aes_iv))
register_encryptor(FactorEncryptMethod.MD5, MD5Encryptor())
register_encryptor(FactorEncryptMethod.SHA256, SHA256Encryptor())
register_encryptor(FactorEncryptMethod.MASK_MAIL, MailMasker())
register_encryptor(FactorEncryptMethod.MASK_CENTER_3, CenterMasker(3))
register_encryptor(FactorEncryptMethod.MASK_CENTER_5, CenterMasker(5))
register_encryptor(FactorEncryptMethod.MASK_LAST_3, LastMasker(3))
register_encryptor(FactorEncryptMethod.MASK_LAST_6, LastMasker(6))
date_formats = ask_all_date_formats()
register_encryptor(FactorEncryptMethod.MASK_MONTH_DAY, DateMasker(month=True, day=True, formats=date_formats))
register_encryptor(FactorEncryptMethod.MASK_MONTH, DateMasker(month=True, day=False, formats=date_formats))
register_encryptor(FactorEncryptMethod.MASK_DAY, DateMasker(month=False, day=True, formats=date_formats))
