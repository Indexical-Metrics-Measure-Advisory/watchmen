from typing import List

from watchmen_sensing.common.constants import ASSET_TYPE_PIPELINE, RISK_LOW, SIGNAL_PIPELINE_FAILURE
from watchmen_sensing.model.autonomous import AutonomousLevel, RecommendedAction
from watchmen_sensing.model.evidence import Evidence
from watchmen_sensing.model.payload import PipelineFailurePayload
from watchmen_sensing.model.signal import Signal, SignalCategory, SignalSeverity
from watchmen_sensing.sensor.base_sensor import BaseSensor, SensorContext
from watchmen_sensing.sensor.registry import register


@register
class PipelineFailureSensor(BaseSensor):
	"""Operational sensing (section 16). Reports failed pipeline runs from the
	pipeline monitor log and recommends an investigation / retry.
	"""

	sensorType = 'pipeline_failure'
	category = SignalCategory.OPERATIONAL

	def detect(self, ctx: SensorContext) -> List[Signal]:
		failed_logs = ctx.adapters.pipeline.find_recent_failures(ctx.tenantId)
		signals: List[Signal] = []
		for log in failed_logs:
			payload = PipelineFailurePayload(
				status=str(getattr(log, 'status', '') or ''),
				errorCode=None,
				errorMessage=getattr(log, 'error', None),
				spentMillis=getattr(log, 'spentInMills', None)
			)
			actions = [
				RecommendedAction(
					type='INVESTIGATE_PIPELINE', autonomousLevel=AutonomousLevel.OBSERVE,
					riskLevel=RISK_LOW, executionMode='manual'),
				RecommendedAction(
					type='RETRY', autonomousLevel=AutonomousLevel.AUTO_EXECUTE,
					riskLevel=RISK_LOW, executionMode='auto'),
			]
			signals.append(self.build_signal(
				ctx, signal_type=SIGNAL_PIPELINE_FAILURE,
				asset_type=ASSET_TYPE_PIPELINE, asset_id=getattr(log, 'pipelineId', None) or getattr(log, 'uid', ''),
				severity=SignalSeverity.HIGH, confidence=0.9,
				evidence=Evidence(
					metrics=payload.model_dump() if hasattr(payload, 'model_dump') else {},
					actual=getattr(log, 'error', None)
				),
				recommended_actions=actions
			))
		return signals
