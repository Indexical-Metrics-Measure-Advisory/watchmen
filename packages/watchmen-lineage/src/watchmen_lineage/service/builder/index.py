from watchmen_lineage.model.lineage import LineageType
from watchmen_lineage.service.builder.indicator_lineage import IndicatorLineageBuilder
from watchmen_lineage.service.builder.objective_lineage import ObjectiveLineageBuilder
from watchmen_lineage.service.builder.pipeline_lineage import PipelineLineageBuilder
from watchmen_lineage.service.builder.subject_lineage import SubjectLineageBuilder
from watchmen_lineage.service.builder.topic_lineage import TopicLineageBuilder


def get_builder(lineage_type: LineageType):
	if lineage_type == LineageType.TOPIC:
		return TopicLineageBuilder()
	elif lineage_type == LineageType.PIPELINE:
		return PipelineLineageBuilder()
	elif lineage_type == LineageType.SUBJECT:
		return SubjectLineageBuilder()
	elif lineage_type == LineageType.INDICATOR:
		return IndicatorLineageBuilder()
	elif lineage_type == LineageType.OBJECTIVE:
		return ObjectiveLineageBuilder()
