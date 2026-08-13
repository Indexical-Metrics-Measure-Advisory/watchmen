from typing import List

from watchmen_sensing.common.constants import ASSET_TYPE_TOPIC, SIGNAL_SOURCE_DISCOVERED
from watchmen_sensing.model.signal import Signal, SignalCategory, SignalSeverity
from watchmen_sensing.sensor.base_sensor import BaseSensor, SensorContext
from watchmen_sensing.sensor.registry import register


@register
class SourceDiscoverySensor(BaseSensor):
	"""Source sensing (section 6). Discovers data assets that are not yet mapped
	to the ontology world model — these are the prime candidates to onboard.

	MVP heuristic: a topic that no VirtualOntology references is reported as a
	SOURCE_DISCOVERED candidate.
	"""

	sensorType = 'source_discovery'
	category = SignalCategory.SOURCE

	def detect(self, ctx: SensorContext) -> List[Signal]:
		topics = ctx.adapters.list_topics(ctx.tenantId)
		mapped_topic_ids = set(ctx.adapters.ontology.list_topic_ids(ctx.tenantId))
		signals: List[Signal] = []
		for topic in topics:
			if topic.topicId in mapped_topic_ids:
				continue
			signals.append(self.build_signal(
				ctx, signal_type=SIGNAL_SOURCE_DISCOVERED,
				asset_type=ASSET_TYPE_TOPIC, asset_id=topic.topicId,
				severity=SignalSeverity.LOW, confidence=0.5,
				evidence=None
			))
		return signals
