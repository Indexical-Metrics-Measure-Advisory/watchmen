from watchmen_lineage.model.lineage import LineageType
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
