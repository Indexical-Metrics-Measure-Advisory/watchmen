from pydantic import BaseSettings


class ReactorSettings(BaseSettings):
	REACTOR_CACHE: bool = True  # enable reactor cache, keep it enabled in production
	REACTOR_CACHE_HEART_BEAT: bool = True  # enable reactor cache heart beat
	REACTOR_CACHE_HEART_BEAT_INTERVAL: int = 60  # reactor cache heart beat interval, in seconds
	PRESTO: bool = True  # presto

	class Config:
		env_file = '.env'
		env_file_encoding = 'utf-8'
		case_sensitive = True


settings = ReactorSettings()


def ask_cache_enabled() -> bool:
	return settings.REACTOR_CACHE


def ask_cache_heart_beat_enabled() -> bool:
	return settings.REACTOR_CACHE_HEART_BEAT


def ask_cache_heart_beat_interval() -> int:
	return settings.REACTOR_CACHE_HEART_BEAT_INTERVAL


def ask_presto_enabled() -> bool:
	return settings.PRESTO
