from watchmen_rest import RestSettings


class SensingSettings(RestSettings):
	APP_NAME: str = 'Watchmen Sensing'
	# LLM provider for pydantic-ai agents. A pydantic-ai model string,
	# e.g. 'azure:gpt-4o', 'openai:gpt-4o'. Left empty disables AI reasoning.
	SENSING_LLM_MODEL: str = ''
	SENSING_LLM_API_KEY: str = ''
	SENSING_LLM_API_BASE: str = ''
	SENSING_LLM_API_VERSION: str = ''
	# Whether the periodic sensing scheduler is enabled on startup.
	SENSING_SCHEDULER_ENABLED: bool = False
	# Highest autonomous level the system is allowed to reach (0..3).
	# 0=Observe, 1=Recommend, 2=AutoExecute, 3=Autonomous.
	SENSING_AUTONOMOUS_LEVEL: int = 1


sensing_settings = SensingSettings()


def ask_sensing_llm_model() -> str:
	return sensing_settings.SENSING_LLM_MODEL


def ask_sensing_llm_api_key() -> str:
	return sensing_settings.SENSING_LLM_API_KEY


def ask_sensing_llm_api_base() -> str:
	return sensing_settings.SENSING_LLM_API_BASE


def ask_sensing_llm_api_version() -> str:
	return sensing_settings.SENSING_LLM_API_VERSION


def ask_sensing_scheduler_enabled() -> bool:
	return sensing_settings.SENSING_SCHEDULER_ENABLED


def ask_sensing_autonomous_level() -> int:
	# Clamp to the documented 0..3 range so a bad env value cannot silently raise
	# the autonomous boundary above AUTONOMOUS.
	return max(0, min(3, sensing_settings.SENSING_AUTONOMOUS_LEVEL))
