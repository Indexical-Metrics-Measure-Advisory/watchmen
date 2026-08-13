from datetime import datetime, timedelta
from typing import List

from watchmen_sensing.common.constants import ASSET_TYPE_TOPIC, SIGNAL_TOPIC_DEFINITION_CHANGED
from watchmen_sensing.model.evidence import Evidence
from watchmen_sensing.model.payload import SchemaChangePayload
from watchmen_sensing.model.signal import Signal, SignalCategory, SignalSeverity
from watchmen_sensing.sensor.base_sensor import BaseSensor, SensorContext
from watchmen_sensing.sensor.registry import register


@register
class SchemaChangeSensor(BaseSensor):
	"""Watchmen Topic definition sensing (NOT external DB schema).

	Boundary -- this sensor is deliberately distinct from SchemaDriftSensor:
	  * SchemaChangeSensor   -> a watchmen *Topic* definition was edited
	    (weak timestamp heuristic; emits TOPIC_DEFINITION_CHANGED).
	  * SchemaDriftSensor    -> the *external business DB* columns actually
	    changed (precise field-level diff; emits SCHEMA_CHANGED).

	They target different layers and must not emit the same signalType, to keep
	signal semantics unambiguous. MVP heuristic: a persisted topic edited within
	``sinceHours`` is reported as a potential TOPIC_DEFINITION_CHANGED signal.
	A baseline schema-snapshot store (planned for a later iteration) will turn
	this into a precise before/after diff.
	"""

	sensorType = 'schema_change'
	category = SignalCategory.SCHEMA

	def detect(self, ctx: SensorContext) -> List[Signal]:
		since_hours = int(ctx.config.get('sinceHours', 24))
		since = datetime.now() - timedelta(hours=since_hours)
		topics = ctx.adapters.find_topics_modified_after(since, ctx.tenantId)
		signals: List[Signal] = []
		for topic in topics:
			payload = SchemaChangePayload(changeType='DEFINITION_MODIFIED')
			signals.append(self.build_signal(
				ctx, signal_type=SIGNAL_TOPIC_DEFINITION_CHANGED,
				asset_type=ASSET_TYPE_TOPIC, asset_id=topic.topicId,
				severity=SignalSeverity.MEDIUM, confidence=0.4,
				evidence=Evidence(
					metrics=payload.model_dump() if hasattr(payload, 'model_dump') else {},
					notes='Watchmen topic definition modified; baseline diff not yet available.'
				)
			))
		return signals
