from typing import List

from watchmen_model.admin import Pipeline, Topic, PipelineTriggerType, PipelineStage, PipelineUnit, \
	WriteTopicActionType, Factor
from watchmen_model.admin.pipeline_action_write import InsertOrMergeRowAction, MappingFactor
from watchmen_model.common import TopicFactorParameter, ParameterKind, ParameterJoint, ParameterJointType, \
	ParameterExpression, ParameterExpressionOperator, ConstantParameter
from watchmen_utilities import ArrayHelper


def find_topic(topics: List[Topic], topic_name: str) -> Topic:
	return ArrayHelper(topics).find(lambda x: x.name == topic_name)



def find_factor(topic: Topic, factor_name: str) -> Factor:
	return ArrayHelper(topic.factors).find(lambda x: x.name == factor_name)


def find_source_parameter(topic: Topic, factor_name: str) -> TopicFactorParameter:
	return TopicFactorParameter(
		kind=ParameterKind.TOPIC, topicId=topic.topicId,
		factorId=find_factor(topic, factor_name).factorId
	)


# noinspection PyUnusedLocal
def ask_pipeline_monitor_pipelines(topics: List[Topic]) -> List[Pipeline]:
	topic_raw: Topic = find_topic(topics, 'raw_pipeline_monitor_log')
	topic_error: Topic = find_topic(topics, 'pipeline_monitor_error_log')

	return [
		Pipeline(
			name='Pipeline Error ',
			topicId=topic_raw.topicId,
			type=PipelineTriggerType.INSERT_OR_MERGE,
			stages=[PipelineStage(
				stageId='error-pipeline-s-1',
				name='Monitor Pipeline Stage 1',
				units=[PipelineUnit(
					unitId='error-u-1',
					name='error Pipeline Unit 1',
					do=[InsertOrMergeRowAction(
						actionId='error-a-1',
						type=WriteTopicActionType.INSERT_ROW,
						topicId=topic_error.topicId,
						mapping=[
							MappingFactor(
								source=find_source_parameter(topic_raw, 'dataId'),
								factorId=find_factor(topic_error, 'dataId').factorId),
							MappingFactor(
								source=find_source_parameter(topic_raw, 'topicId'),
								factorId=find_factor(topic_error, 'topicId').factorId),
							MappingFactor(
								source=find_source_parameter(topic_raw, 'status'),
								factorId=find_factor(topic_error, 'status').factorId),
							MappingFactor(
								source=find_source_parameter(topic_raw, 'traceId'),
								factorId=find_factor(topic_error, 'traceId').factorId),
							MappingFactor(
								source=find_source_parameter(topic_raw, 'pipelineId'),
								factorId=find_factor(topic_error, 'pipelineId').factorId),
							MappingFactor(
								source=find_source_parameter(topic_raw, 'uid'),
								factorId=find_factor(topic_error, 'uid').factorId),

						]
					)]
				)],
				conditional=True,
				on=ParameterJoint(
					jointType=ParameterJointType.AND,
					filters=[
						ParameterExpression(
							left=find_source_parameter(topic_raw, 'status'),
							operator=ParameterExpressionOperator.EQUALS,
							right=ConstantParameter(kind=ParameterKind.CONSTANT,value="ERROR")
						)
					]
				)
			)],
			enabled=True,
			validated=True
		)
	]
