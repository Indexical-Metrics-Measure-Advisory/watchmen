from pydantic import BaseSettings


class ReactorSettings(BaseSettings):
	REACTOR_CACHE: bool = True
	PRESTO: bool = True


settings = ReactorSettings()


def ask_cache_enabled() -> bool:
	return settings.REACTOR_CACHE


def ask_presto_enabled() -> bool:
	return settings.PRESTO
