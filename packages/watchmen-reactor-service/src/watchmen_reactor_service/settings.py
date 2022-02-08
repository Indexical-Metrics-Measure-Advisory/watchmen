from pydantic import BaseSettings


class ReactorSettings(BaseSettings):
	CACHE: bool = True


class SingletonSettings:
	def __init__(self):
		self.settings = ReactorSettings()

	def replace(self, another_settings: ReactorSettings):
		self.settings = settings

	def is_cache_enabled(self) -> bool:
		return self.settings.CACHE


settings = SingletonSettings()


def apply_settings(a_settings: ReactorSettings) -> None:
	settings.replace(a_settings)


def ask_cache_enabled() -> bool:
	return settings.is_cache_enabled()
