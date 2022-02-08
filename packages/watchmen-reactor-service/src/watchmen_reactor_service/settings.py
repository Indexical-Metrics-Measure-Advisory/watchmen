from pydantic import BaseSettings


class ReactorSettings(BaseSettings):
	REACTOR_CACHE: bool = True  # enable reactor cache, keep it enabled in production
	REACTOR_CACHE_HEART_BEAT: bool = True  # enable reactor cache heart beat
	REACTOR_CACHE_HEART_BEAT_INTERVAL: int = 60  # reactor cache heart beat interval, in seconds
	PRESTO: bool = True  # presto


settings = ReactorSettings()


def ask_cache_enabled() -> bool:
	return settings.REACTOR_CACHE


def ask_presto_enabled() -> bool:
	return settings.PRESTO
