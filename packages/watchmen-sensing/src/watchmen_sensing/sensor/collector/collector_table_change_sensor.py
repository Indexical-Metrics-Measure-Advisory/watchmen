from datetime import datetime, timedelta
from typing import List

from watchmen_sensing.common.constants import ASSET_TYPE_COLLECTOR_TABLE, SIGNAL_COLLECTOR_TABLE_CHANGED
from watchmen_sensing.model.evidence import Evidence
from watchmen_sensing.model.payload import CollectorTableChangePayload
from watchmen_sensing.model.signal import Signal, SignalCategory, SignalSeverity
from watchmen_sensing.sensor.base_sensor import BaseSensor, SensorContext
from watchmen_sensing.sensor.registry import register


@register
class CollectorTableChangeSensor(BaseSensor):
	"""Collector *configuration* metadata sensing -- NOT external DB schema.

	Boundary -- deliberately distinct from SchemaDriftSensor:
	  * CollectorTableChangeSensor (this) -> a ``CollectorTableConfig`` row was
	    created/edited (primaryKey/joinKeys/ignoredColumns changed by an admin).
	    Emits COLLECTOR_TABLE_CHANGED.
	  * SchemaDriftSensor -> the *external DB table* columns actually changed
	    (SCHEMA_CHANGED). Use that for field-level drift of the source table.

	They watch different things (config vs. live schema) and emit different
	signalTypes. MVP heuristic: a CollectorTableConfig whose ``lastModifiedAt``
	falls within ``sinceHours`` is reported as COLLECTOR_TABLE_CHANGED. When the
	config was also newly created (``createdAt`` within the same window) the
	change type is TABLE_ADDED; otherwise DEFINITION_MODIFIED.

	Config shape::

	    {"sinceHours": 24}
	"""

	sensorType = 'collector_table_change'
	category = SignalCategory.OPERATIONAL

	def detect(self, ctx: SensorContext) -> List[Signal]:
		since_hours = int(ctx.config.get('sinceHours', 24))
		since = datetime.now() - timedelta(hours=since_hours)
		configs = ctx.adapters.collector.find_configs_modified_after(since, ctx.tenantId)
		signals: List[Signal] = []
		for config in configs:
			created = getattr(config, 'createdAt', None)
			is_new = _is_within_window(created, since)
			change_type = 'TABLE_ADDED' if is_new else 'DEFINITION_MODIFIED'
			payload = CollectorTableChangePayload(
				changeType=change_type,
				tableName=getattr(config, 'tableName', None),
				modelName=getattr(config, 'modelName', None),
				dataSourceId=getattr(config, 'dataSourceId', None)
			)
			severity = SignalSeverity.MEDIUM if is_new else SignalSeverity.LOW
			confidence = 0.6 if is_new else 0.4
			asset_id = getattr(config, 'configId', None) or getattr(config, 'tableName', 'unknown')
			signals.append(self.build_signal(
				ctx, signal_type=SIGNAL_COLLECTOR_TABLE_CHANGED,
				asset_type=ASSET_TYPE_COLLECTOR_TABLE, asset_id=asset_id,
				severity=severity, confidence=confidence,
				evidence=Evidence(
					metrics=payload.model_dump() if hasattr(payload, 'model_dump') else {},
					notes=f'Collector table config {change_type.lower()}; baseline diff not yet available.'
				)
			))
		return signals


def _is_within_window(dt, since: datetime) -> bool:
	"""Return True when *dt* is a datetime on or after *since* (naive comparison)."""
	if dt is None:
		return False
	if isinstance(dt, datetime):
		naive = dt.replace(tzinfo=None) if dt.tzinfo is not None else dt
	else:
		try:
			naive = datetime.fromisoformat(str(dt)).replace(tzinfo=None)
		except Exception:
			return False
	since_naive = since.replace(tzinfo=None) if since.tzinfo is not None else since
	return naive >= since_naive
