import os

from watchmen_sensing.common.exception import LlmNotConfiguredException
from watchmen_sensing.settings import (
	ask_sensing_llm_api_base, ask_sensing_llm_api_key, ask_sensing_llm_api_version,
	ask_sensing_llm_model
)


def is_llm_configured() -> bool:
	return bool(ask_sensing_llm_model())


def configure_llm_env() -> None:
	"""Bridge SENSING_LLM_* settings into the environment variables that
	pydantic-ai's providers read (OpenAI / Azure). Safe to call at startup.
	"""
	if ask_sensing_llm_api_key():
		os.environ.setdefault('AZURE_API_KEY', ask_sensing_llm_api_key())
		os.environ.setdefault('OPENAI_API_KEY', ask_sensing_llm_api_key())
	if ask_sensing_llm_api_base():
		os.environ.setdefault('AZURE_API_BASE', ask_sensing_llm_api_base())
	if ask_sensing_llm_api_version():
		os.environ.setdefault('AZURE_API_VERSION', ask_sensing_llm_api_version())


def build_model() -> str:
	"""Return a pydantic-ai model name string from settings.

	Examples: ``azure:gpt-4o``, ``openai:gpt-4o``. Credentials are provided via
	environment by :func:`configure_llm_env`.
	"""
	model = ask_sensing_llm_model()
	if not model:
		raise LlmNotConfiguredException(
			'Sensing LLM is not configured. Set SENSING_LLM_MODEL and credentials.')
	return model
