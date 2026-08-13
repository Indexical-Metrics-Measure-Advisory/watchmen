from typing import Any, Dict, List, Optional

from watchmen_auth import PrincipalService
from watchmen_indicator_surface.util import trans

from watchmen_sensing.adapter import AdapterBundle
from watchmen_sensing.meta.action_record_service import ActionRecordService
from watchmen_sensing.meta.sensor_service import SensorService
from watchmen_sensing.meta.signal_service import SignalService
from watchmen_sensing.model.sensor import Sensor as SensorConfig
from watchmen_sensing.model.signal import SignalCategory
from watchmen_sensing.sensor import registry
from watchmen_sensing.sensor.base_sensor import SensorContext
from watchmen_sensing.service.signal_lifecycle_service import SignalLifecycleService


_BUILTIN_LOADED = False


def _ensure_builtin_sensors() -> None:
	global _BUILTIN_LOADED
	if not _BUILTIN_LOADED:
		registry.load_builtin_sensors()
		_BUILTIN_LOADED = True


class SensingService:
	"""Top-level orchestrator. Runs sensors and pushes raw signals through the
	lifecycle pipeline (sense -> signal -> context -> reasoning -> action).
	"""

	def __init__(
			self, sensor_service: SensorService, signal_service: SignalService,
			action_record_service: ActionRecordService, adapters: AdapterBundle,
			principal_service: PrincipalService, autonomous_level_cap: int
	):
		_ensure_builtin_sensors()
		self.sensor_service = sensor_service
		self.signal_service = signal_service
		self.action_record_service = action_record_service
		self.adapters = adapters
		self.principal_service = principal_service
		self.autonomous_level_cap = autonomous_level_cap

	def _lifecycle(self) -> SignalLifecycleService:
		return SignalLifecycleService(
			self.signal_service, self.action_record_service,
			self.adapters, self.autonomous_level_cap)

	def _enabled_sensors(self, category: Optional[SignalCategory]) -> List[SensorConfig]:
		sensors = self.sensor_service.find_enabled(self.principal_service.get_tenant_id())
		if category is not None:
			sensors = [s for s in sensors if s.category == category]
		return sensors

	async def run_cycle(self, category: Optional[SignalCategory] = None) -> Dict[str, Any]:
		tenant_id = self.principal_service.get_tenant_id()
		sensors = self._enabled_sensors(category)
		signals_produced = 0
		lifecycle = self._lifecycle()
		for sensor_cfg in sensors:
			cls = registry.get_sensor_class(sensor_cfg.sensorType)
			if cls is None:
				continue
			sensor = cls()
			ctx = SensorContext(
				principal_service=self.principal_service, tenant_id=tenant_id,
				adapters=self.adapters, config=sensor_cfg.config or {})
			try:
				raw_signals = sensor.detect(ctx)
			except Exception:
				# A failing sensor must not abort the whole cycle.
				continue
			for signal in raw_signals:
				signal.signalId = str(self.signal_service.snowflakeGenerator.next_id())
				trans(self.signal_service, lambda s=signal: self.signal_service.create(s))
				await lifecycle.run_pipeline(signal)
				signals_produced += 1
		return {
			'sensorsRun': len(sensors),
			'signalsProduced': signals_produced,
			'category': category.value if category is not None else None
		}

	async def run_sensor(self, sensor_type: str, config: Optional[dict] = None) -> Dict[str, Any]:
		"""Run a single registered sensor by type, regardless of stored config."""
		_ensure_builtin_sensors()
		cls = registry.get_sensor_class(sensor_type)
		if cls is None:
			return {'sensorsRun': 0, 'signalsProduced': 0, 'error': f'unknown sensor[{sensor_type}]'}
		tenant_id = self.principal_service.get_tenant_id()
		sensor = cls()
		ctx = SensorContext(
			principal_service=self.principal_service, tenant_id=tenant_id,
			adapters=self.adapters, config=config or {})
		try:
			raw_signals = sensor.detect(ctx)
		except Exception as e:
			return {
				'sensorsRun': 1,
				'signalsProduced': 0,
				'sensorType': sensor_type,
				'error': str(e)
			}
		lifecycle = self._lifecycle()
		for signal in raw_signals:
			signal.signalId = str(self.signal_service.snowflakeGenerator.next_id())
			trans(self.signal_service, lambda s=signal: self.signal_service.create(s))
			await lifecycle.run_pipeline(signal)
		return {
			'sensorsRun': 1,
			'signalsProduced': len(raw_signals),
			'sensorType': sensor_type
		}
