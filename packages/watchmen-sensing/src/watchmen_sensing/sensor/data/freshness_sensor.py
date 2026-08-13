from datetime import datetime
from typing import List

from watchmen_sensing.common.constants import ASSET_TYPE_TOPIC, RISK_LOW, SIGNAL_DATA_FRESHNESS_BREACH
from watchmen_sensing.model.autonomous import AutonomousLevel, RecommendedAction
from watchmen_sensing.model.evidence import Evidence
from watchmen_sensing.model.payload import FreshnessPayload
from watchmen_sensing.model.signal import Signal, SignalCategory, SignalSeverity
from watchmen_sensing.sensor.base_sensor import BaseSensor, SensorContext
from watchmen_sensing.sensor.registry import register


@register
class FreshnessSensor(BaseSensor):
	"""Data freshness sensing (section 10). Checks each configured topic's most
	recent pipeline run against its SLA and emits DATA_FRESHNESS_BREACH on miss.

	Config shape::

	    {"freshnessTargets": [{"topicId": "...", "expectedSeconds": 300}]}
	"""

	sensorType = 'freshness'
	category = SignalCategory.DATA_FRESHNESS

	def detect(self, ctx: SensorContext) -> List[Signal]:
		targets = ctx.config.get('freshnessTargets') or []
		signals: List[Signal] = []
		for target in targets:
			topic_id = target.get('topicId')
			expected_seconds = int(target.get('expectedSeconds', 300))
			if not topic_id:
				continue
			logs = ctx.adapters.pipeline.find_recent_logs(ctx.tenantId, topic_id=topic_id, page_size=1)
			if not logs:
				continue
			last_log = logs[0]
			start_time = getattr(last_log, 'startTime', None)
			if not isinstance(start_time, datetime):
				continue
			# Pipeline monitor timestamps are second-precision without tz.
			now = datetime.now().replace(tzinfo=None, microsecond=0)
			actual_seconds = int((now - start_time.replace(tzinfo=None, microsecond=0)).total_seconds())
			if actual_seconds <= expected_seconds:
				continue
			payload = FreshnessPayload(
				expectedSeconds=expected_seconds,
				actualSeconds=actual_seconds,
				lastUpdateAt=start_time
			)
			severity = SignalSeverity.HIGH if actual_seconds > expected_seconds * 3 else SignalSeverity.MEDIUM
			actions = [
				RecommendedAction(
					type='CHECK_PIPELINE', autonomousLevel=AutonomousLevel.OBSERVE,
					riskLevel=RISK_LOW, executionMode='manual')
			]
			signals.append(self.build_signal(
				ctx, signal_type=SIGNAL_DATA_FRESHNESS_BREACH,
				asset_type=ASSET_TYPE_TOPIC, asset_id=topic_id,
				severity=severity, confidence=0.85,
				evidence=Evidence(
					metrics=payload.model_dump() if hasattr(payload, 'model_dump') else {},
					expected=expected_seconds,
					actual=actual_seconds
				),
				recommended_actions=actions
			))
		return signals
