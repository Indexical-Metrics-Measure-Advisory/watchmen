from pydantic import BaseSettings


class StorageSettings(BaseSettings):
	DECIMAL_INTEGRAL_DIGITS: int = 24
	DECIMAL_FRACTION_DIGITS: int = 8
	DISABLE_COMPILED_CACHE: bool = False


storage_settings = StorageSettings()


def ask_decimal_integral_digits() -> int:
	return storage_settings.DECIMAL_INTEGRAL_DIGITS


def ask_decimal_fraction_digits() -> int:
	return storage_settings.DECIMAL_FRACTION_DIGITS


def ask_disable_compiled_cache() -> bool:
	return storage_settings.DISABLE_COMPILED_CACHE
