from watchmen_lineage.model.lineage import LineageType
from watchmen_lineage.service.builder.indicator_lineage import IndicatorLineageBuilder
from watchmen_lineage.service.builder.objective_lineage import ObjectiveLineageBuilder
from watchmen_lineage.service.builder.pipeline_lineage import PipelineLineageBuilder
from watchmen_lineage.service.builder.subject_lineage import SubjectLineageBuilder
from watchmen_lineage.service.builder.topic_lineage import TopicLineageBuilder


def get_builder(lineage_type: LineageType):
	if lineage_type == LineageType.TOPIC or lineage_type == LineageType.FACTOR:
		return TopicLineageBuilder(LineageType.TOPIC)
	elif lineage_type == LineageType.PIPELINE:
		return PipelineLineageBuilder(LineageType.PIPELINE)
	elif lineage_type == LineageType.SUBJECT or lineage_type == LineageType.COLUMN:
		return SubjectLineageBuilder(LineageType.SUBJECT)
	elif lineage_type == LineageType.INDICATOR:
		return IndicatorLineageBuilder(LineageType.INDICATOR)
	elif lineage_type == LineageType.OBJECTIVE or lineage_type == LineageType.OBJECTIVE_TARGET or lineage_type == LineageType.OBJECTIVE_INDICATOR:
		return ObjectiveLineageBuilder(LineageType.OBJECTIVE)
