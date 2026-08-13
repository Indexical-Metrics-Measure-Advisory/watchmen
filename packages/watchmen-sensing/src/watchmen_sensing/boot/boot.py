from typing import Callable, Optional

from watchmen_auth import PrincipalService

from watchmen_sensing.scheduler.sensing_scheduler import SensingScheduler
from watchmen_sensing.settings import ask_sensing_scheduler_enabled

PrincipalProvider = Callable[[], Optional[PrincipalService]]

_scheduler: Optional[SensingScheduler] = None


def init_sensing_jobs(principal_provider: Optional[PrincipalProvider] = None) -> Optional[SensingScheduler]:
	"""Initialise the periodic sensing scheduler.

	Returns the started scheduler when ``SENSING_SCHEDULER_ENABLED`` is on and a
	principal provider is supplied; otherwise returns None (no-op). Safe to call
	from the host app's startup hook.
	"""
	global _scheduler
	if not ask_sensing_scheduler_enabled():
		return None
	if principal_provider is None:
		return None
	_scheduler = SensingScheduler()
	_scheduler.start(principal_provider)
	return _scheduler


def shutdown_sensing_jobs() -> None:
	global _scheduler
	if _scheduler is not None:
		_scheduler.shutdown()
		_scheduler = None
