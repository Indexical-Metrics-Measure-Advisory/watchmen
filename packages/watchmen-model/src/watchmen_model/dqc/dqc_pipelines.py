from typing import List

from watchmen_model.admin import Factor, MappingFactor, Pipeline, PipelineStage, PipelineTriggerType, PipelineUnit, \
	Topic, WriteTopicActionType
from watchmen_model.admin.pipeline_action_write import InsertOrMergeRowAction
from watchmen_model.common import ComputedParameter, ConstantParameter, ParameterComputeType, ParameterExpression, \
	ParameterExpressionOperator, ParameterJoint, ParameterJointType, ParameterKind, TopicFactorParameter
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


def find_part_of_process_date(topic: Topic, factor_name: str, part: ParameterComputeType) -> ComputedParameter:
	return ComputedParameter(
		kind=ParameterKind.COMPUTED,
		type=part,
		parameters=[find_source_parameter(topic, factor_name)]
	)


def ask_dqc_pipelines(topics: List[Topic]) -> List[Pipeline]:
	# define all dqc pipelines
	topic_raw: Topic = find_topic(topics, 'dqc_raw_rule_result')
	topic_daily: Topic = find_topic(topics, 'dqc_rule_daily')

	return [
		Pipeline(
			name='DQC Pipeline',
			topicId=topic_raw.topicId,
			type=PipelineTriggerType.INSERT_OR_MERGE,
			stages=[PipelineStage(
				stageId='dqcp-s-1',
				name='DQC Pipeline Stage 1',
				units=[PipelineUnit(
					unitId='dqcp-u-1',
					name='DQC Pipeline Unit 1',
					do=[InsertOrMergeRowAction(
						actionId='dqcp-a-1',
						type=WriteTopicActionType.INSERT_OR_MERGE_ROW,
						topicId=topic_daily.topicId,
						mapping=[
							MappingFactor(
								source=find_source_parameter(topic_raw, 'ruleCode'),
								factorId=find_factor(topic_daily, 'ruleCode').factorId),
							MappingFactor(
								source=find_source_parameter(topic_raw, 'topicId'),
								factorId=find_factor(topic_daily, 'topicId').factorId),
							MappingFactor(
								source=find_source_parameter(topic_raw, 'factorId'),
								factorId=find_factor(topic_daily, 'factorId').factorId),
							MappingFactor(
								source=find_part_of_process_date(
									topic_raw, 'processDate', ParameterComputeType.YEAR_OF),
								factorId=find_factor(topic_daily, 'year').factorId),
							MappingFactor(
								source=find_part_of_process_date(
									topic_raw, 'processDate', ParameterComputeType.MONTH_OF),
								factorId=find_factor(topic_daily, 'month').factorId),
							MappingFactor(
								source=find_part_of_process_date(
									topic_raw, 'processDate', ParameterComputeType.DAY_OF_MONTH),
								factorId=find_factor(topic_daily, 'day').factorId),
							MappingFactor(
								source=find_source_parameter(topic_raw, 'processDate'),
								factorId=find_factor(topic_daily, 'processDate').factorId),
							MappingFactor(
								source=ComputedParameter(
									kind=ParameterKind.COMPUTED,
									type=ParameterComputeType.CASE_THEN,
									parameters=[
										ConstantParameter(
											kind=ParameterKind.CONSTANT,
											conditional=True,
											on=ParameterJoint(
												jointType=ParameterJointType.AND,
												filters=[
													ParameterExpression(
														left=find_source_parameter(topic_raw, 'detected'),
														operator=ParameterExpressionOperator.EQUALS,
														right=ConstantParameter(
															kind=ParameterKind.CONSTANT,
															value="true"
														)
													)
												]
											),
											value="1"
										),
										ConstantParameter(
											kind=ParameterKind.CONSTANT,
											value="0"
										)
									]
								),
								factorId=find_factor(topic_daily, 'count').factorId)
						],
						by=ParameterJoint(
							jointType=ParameterJointType.AND,
							filters=[
								ParameterExpression(
									left=find_source_parameter(topic_raw, 'ruleCode'),
									operator=ParameterExpressionOperator.EQUALS,
									right=find_source_parameter(topic_daily, 'ruleCode')
								),
								ParameterExpression(
									left=find_source_parameter(topic_raw, 'topicId'),
									operator=ParameterExpressionOperator.EQUALS,
									right=find_source_parameter(topic_daily, 'topicId')
								),
								ParameterExpression(
									left=find_source_parameter(topic_raw, 'factorId'),
									operator=ParameterExpressionOperator.EQUALS,
									right=find_source_parameter(topic_daily, 'factorId')
								),
								ParameterExpression(
									left=find_part_of_process_date(
										topic_raw, 'processDate', ParameterComputeType.YEAR_OF),
									operator=ParameterExpressionOperator.EQUALS,
									right=find_source_parameter(topic_daily, 'year')
								),
								ParameterExpression(
									left=find_part_of_process_date(
										topic_raw, 'processDate', ParameterComputeType.MONTH_OF),
									operator=ParameterExpressionOperator.EQUALS,
									right=find_source_parameter(topic_daily, 'month')
								),
								ParameterExpression(
									left=find_part_of_process_date(
										topic_raw, 'processDate', ParameterComputeType.DAY_OF_MONTH),
									operator=ParameterExpressionOperator.EQUALS,
									right=find_source_parameter(topic_daily, 'day')
								)
							]
						)
					)]
				)]
			)],
			enabled=True,
			validated=True
		)
	]
