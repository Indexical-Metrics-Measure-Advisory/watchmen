class SensingException(Exception):
	"""Base exception for the sensing package."""


class SignalNotFoundException(SensingException):
	pass


class SensorNotFoundException(SensingException):
	pass


class IllegalSignalTransitionException(SensingException):
	"""Raised when a signal lifecycle transition is not allowed from the current status."""


class ActionNotFoundException(SensingException):
	pass


class ActionNotApprovedException(SensingException):
	"""Raised when trying to execute an action that still requires approval."""


class LlmNotConfiguredException(SensingException):
	"""Raised when an AI agent is invoked but the LLM model is not configured."""
