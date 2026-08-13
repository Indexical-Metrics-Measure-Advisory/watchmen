from typing import List

from watchmen_sensing.common.constants import ASSET_TYPE_TOPIC, SIGNAL_DATA_PROFILE_READY
from watchmen_sensing.model.evidence import Evidence
from watchmen_sensing.model.signal import Signal, SignalCategory, SignalSeverity
from watchmen_sensing.sensor.base_sensor import BaseSensor, SensorContext
from watchmen_sensing.sensor.registry import register


def _to_dict(value) -> dict:
	if value is None:
		return {}
	if hasattr(value, 'model_dump'):
		return value.model_dump()
	if isinstance(value, dict):
		return value
	return {'value': str(value)}


@register
class DataProfileSensor(BaseSensor):
	"""Data sensing (section 8). Publishes a compressed data profile per topic so
	that downstream reasoning never needs the raw rows (section 29).
	"""

	sensorType = 'data_profile'
	category = SignalCategory.DATA

	def detect(self, ctx: SensorContext) -> List[Signal]:
		days = int(ctx.config.get('profileDays', 1))
		topic_ids = ctx.config.get('topicIds') or [
			t.topicId for t in ctx.adapters.list_topics(ctx.tenantId)
		]
		signals: List[Signal] = []
		for topic_id in topic_ids:
			profile = ctx.adapters.dqc.find_topic_profile(topic_id, days=days)
			if profile is None:
				continue
			signals.append(self.build_signal(
				ctx, signal_type=SIGNAL_DATA_PROFILE_READY,
				asset_type=ASSET_TYPE_TOPIC, asset_id=topic_id,
				severity=SignalSeverity.LOW, confidence=0.9,
				evidence=Evidence(metrics=_to_dict(profile))
			))
		return signals
