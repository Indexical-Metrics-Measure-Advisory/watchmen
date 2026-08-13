"""P1/P2 sensor stubs (extension skeleton).

These sensors are registered so the system knows they exist and where they fit
in the priority matrix (section 26), but their ``detect`` methods emit nothing
yet. Filling in a stub only requires implementing ``detect``; the registry,
context engine and action engine pick it up automatically.
"""

from typing import List

from watchmen_sensing.model.sensor import SensorPriority
from watchmen_sensing.model.signal import Signal, SignalCategory
from watchmen_sensing.sensor.base_sensor import BaseSensor, SensorContext
from watchmen_sensing.sensor.registry import register


class _StubSensor(BaseSensor):
	"""Base for not-yet-implemented sensors. Emits no signals."""

	priority = SensorPriority.P1

	def detect(self, ctx: SensorContext) -> List[Signal]:
		return []


@register
class DataDriftSensor(_StubSensor):
	sensorType = 'data_drift'
	category = SignalCategory.DATA_DRIFT
	priority = SensorPriority.P1


@register
class RelationshipSensor(_StubSensor):
	sensorType = 'relationship'
	category = SignalCategory.SEMANTIC
	priority = SensorPriority.P1


@register
class LineageSensor(_StubSensor):
	sensorType = 'lineage_change'
	category = SignalCategory.LINEAGE
	priority = SensorPriority.P1


@register
class DataClassificationSensor(_StubSensor):
	sensorType = 'data_classification'
	category = SignalCategory.DATA
	priority = SensorPriority.P1


@register
class DataContractSensor(_StubSensor):
	sensorType = 'data_contract'
	category = SignalCategory.DATA
	priority = SensorPriority.P1


@register
class PipelinePerformanceSensor(_StubSensor):
	sensorType = 'pipeline_performance'
	category = SignalCategory.OPERATIONAL
	priority = SensorPriority.P1


@register
class OntologyGapSensor(_StubSensor):
	sensorType = 'ontology_gap'
	category = SignalCategory.BUSINESS
	priority = SensorPriority.P1


@register
class DataProductGapSensor(_StubSensor):
	sensorType = 'data_product_gap'
	category = SignalCategory.BUSINESS
	priority = SensorPriority.P1


@register
class MetricAnomalySensor(_StubSensor):
	sensorType = 'metric_anomaly'
	category = SignalCategory.BUSINESS
	priority = SensorPriority.P1


@register
class UsageSensor(_StubSensor):
	sensorType = 'usage'
	category = SignalCategory.USAGE
	priority = SensorPriority.P1


@register
class DuplicateAssetSensor(_StubSensor):
	sensorType = 'duplicate_asset'
	category = SignalCategory.DATA
	priority = SensorPriority.P2


@register
class CostSensor(_StubSensor):
	sensorType = 'cost'
	category = SignalCategory.OPERATIONAL
	priority = SensorPriority.P2


@register
class BusinessRuleSensor(_StubSensor):
	sensorType = 'business_rule'
	category = SignalCategory.BUSINESS
	priority = SensorPriority.P2


@register
class BusinessSemanticDriftSensor(_StubSensor):
	sensorType = 'business_semantic_drift'
	category = SignalCategory.BUSINESS
	priority = SensorPriority.P2
