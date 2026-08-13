from typing import Dict, List, Optional, Type

from watchmen_sensing.sensor.base_sensor import BaseSensor

_SENSOR_REGISTRY: Dict[str, Type[BaseSensor]] = {}


def register(cls: Type[BaseSensor]) -> Type[BaseSensor]:
	"""Class decorator that registers a sensor implementation by its sensorType."""
	_SENSOR_REGISTRY[cls.sensorType] = cls
	return cls


def get_sensor_class(sensor_type: str) -> Optional[Type[BaseSensor]]:
	return _SENSOR_REGISTRY.get(sensor_type)


def all_sensor_types() -> List[str]:
	return list(_SENSOR_REGISTRY.keys())


def instantiate(sensor_type: str) -> Optional[BaseSensor]:
	cls = get_sensor_class(sensor_type)
	if cls is None:
		return None
	return cls()


def load_builtin_sensors() -> None:
	"""Import all built-in sensor modules so their @register decorators run."""
	# P0 MVP sensors.
	from watchmen_sensing.sensor.source import source_discovery_sensor  # noqa: F401
	from watchmen_sensing.sensor.schema import schema_change_sensor  # noqa: F401
	from watchmen_sensing.sensor.data import data_profile_sensor  # noqa: F401
	from watchmen_sensing.sensor.data import data_quality_sensor  # noqa: F401
	from watchmen_sensing.sensor.data import freshness_sensor  # noqa: F401
	from watchmen_sensing.sensor.operational import pipeline_failure_sensor  # noqa: F401
	from watchmen_sensing.sensor.semantic import semantic_mapping_sensor  # noqa: F401
	from watchmen_sensing.sensor.collector import collector_table_change_sensor  # noqa: F401
	from watchmen_sensing.sensor.schema import schema_drift_sensor  # noqa: F401
	# P1/P2 stub sensors (extension skeleton).
	from watchmen_sensing.sensor import _ext as ext_sensors  # noqa: F401
