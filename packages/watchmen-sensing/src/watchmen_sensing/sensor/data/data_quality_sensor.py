from typing import List

from watchmen_sensing.common.constants import ASSET_TYPE_TOPIC, RISK_LOW, SIGNAL_DATA_QUALITY_DEGRADED
from watchmen_sensing.model.autonomous import AutonomousLevel, RecommendedAction
from watchmen_sensing.model.evidence import Evidence
from watchmen_sensing.model.payload import DataQualityPayload
from watchmen_sensing.model.signal import Signal, SignalCategory, SignalSeverity
from watchmen_sensing.sensor.base_sensor import BaseSensor, SensorContext
from watchmen_sensing.sensor.registry import register


@register
class DataQualitySensor(BaseSensor):
	"""Data quality sensing (section 9). Surfaces DQC rule violations from the
	existing DQC engine as DATA_QUALITY_DEGRADED signals.
	"""

	sensorType = 'data_quality'
	category = SignalCategory.DATA_QUALITY

	def detect(self, ctx: SensorContext) -> List[Signal]:
		days = int(ctx.config.get('days', 1))
		logs = ctx.adapters.dqc.find_recent_rule_logs(days=days)
		signals: List[Signal] = []
		for log in logs:
			count = getattr(log, 'count', None) or 0
			if count <= 0:
				continue
			payload = DataQualityPayload(
				ruleCode=str(getattr(log, 'ruleCode', '') or ''),
				passed=False,
				ratio=None,
				actual=count
			)
			actions = [
				RecommendedAction(
					type='INVESTIGATE_SOURCE', autonomousLevel=AutonomousLevel.OBSERVE,
					riskLevel=RISK_LOW, executionMode='manual'),
				RecommendedAction(
					type='REPROCESS_DATA', autonomousLevel=AutonomousLevel.AUTO_EXECUTE,
					riskLevel=RISK_LOW, executionMode='auto'),
			]
			topic_id = getattr(log, 'topicId', None) or 'unknown'
			signals.append(self.build_signal(
				ctx, signal_type=SIGNAL_DATA_QUALITY_DEGRADED,
				asset_type=ASSET_TYPE_TOPIC, asset_id=topic_id,
				severity=SignalSeverity.MEDIUM, confidence=0.7,
				evidence=Evidence(
					metrics=payload.model_dump() if hasattr(payload, 'model_dump') else {},
					actual=count,
					notes=f'rule={getattr(log, "ruleCode", None)}'
				),
				recommended_actions=actions
			))
		return signals
