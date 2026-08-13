import asyncio
from logging import getLogger
from typing import Callable, Optional

from apscheduler.schedulers.background import BackgroundScheduler
from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator

from watchmen_sensing.adapter import AdapterBundle
from watchmen_sensing.meta.action_record_service import ActionRecordService
from watchmen_sensing.meta.sensor_service import SensorService
from watchmen_sensing.meta.signal_service import SignalService
from watchmen_sensing.service.sensing_service import SensingService
from watchmen_sensing.settings import ask_sensing_autonomous_level

logger = getLogger(__name__)

# A principal provider returns a PrincipalService for the background run. Host
# apps wire a concrete provider (e.g. a system/admin principal per tenant).
PrincipalProvider = Callable[[], Optional[PrincipalService]]


class SensingScheduler:
	"""Periodic sensing scheduler (section "Sensing" continuous observation).

	Uses APScheduler, mirroring the DQC boot pattern. Host apps supply a
	principal provider so background runs are properly authenticated.
	"""

	def __init__(self, interval_minutes: int = 30):
		self._scheduler = BackgroundScheduler()
		self._interval_minutes = interval_minutes
		self._started = False
		self._principal_provider: Optional[PrincipalProvider] = None

	def start(self, principal_provider: Optional[PrincipalProvider] = None) -> None:
		if self._started:
			return
		self._principal_provider = principal_provider
		self._scheduler.add_job(
			self._tick, 'interval', minutes=self._interval_minutes, id='sensing_tick')
		self._scheduler.start()
		self._started = True
		logger.info('Sensing scheduler started (interval=%s minutes).', self._interval_minutes)

	def shutdown(self) -> None:
		if self._started:
			self._scheduler.shutdown(wait=False)
			self._started = False

	def _tick(self) -> None:
		provider = self._principal_provider
		if provider is None:
			logger.warning('Sensing tick skipped: no principal provider configured.')
			return
		try:
			principal = provider()
		except Exception as e:  # noqa
			logger.error('Sensing tick failed to obtain principal: %s', e)
			return
		if principal is None:
			return
		try:
			asyncio.run(self._run_cycle(principal))
		except Exception as e:  # noqa
			logger.error('Sensing tick failed: %s', e)

	@staticmethod
	async def _run_cycle(principal: PrincipalService) -> None:
		sensor_service = SensorService(ask_meta_storage(), ask_snowflake_generator(), principal)
		signal_service = SignalService(ask_meta_storage(), ask_snowflake_generator(), principal)
		action_record_service = ActionRecordService(
			ask_meta_storage(), ask_snowflake_generator(), principal)
		adapters = AdapterBundle(principal)
		service = SensingService(
			sensor_service=sensor_service, signal_service=signal_service,
			action_record_service=action_record_service, adapters=adapters,
			principal_service=principal,
			autonomous_level_cap=ask_sensing_autonomous_level())
		await service.run_cycle()
