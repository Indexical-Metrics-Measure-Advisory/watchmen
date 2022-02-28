from typing import Dict, List, Optional

from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import TopicService
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_inquiry_kernel.common import InquiryKernelException
from watchmen_model.admin import Topic
from watchmen_model.common import Parameter, ParameterCondition, ParameterExpression, ParameterExpressionOperator, \
	ParameterJoint, \
	TopicId
from watchmen_model.console import Subject, SubjectDatasetColumn, SubjectDatasetJoin
from watchmen_utilities import ArrayHelper, is_blank


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


def find_topic_schema(
		topic_id: Optional[TopicId], join: SubjectDatasetJoin,
		principal_service: PrincipalService, where: str) -> TopicSchema:
	topic_service = get_topic_service(principal_service)
	if is_blank(topic_id):
		raise InquiryKernelException(f'{where} topic of subject join[{join.dict()}] is none.')
	topic: Optional[Topic] = topic_service.find_by_id(topic_id)
	if topic is None:
		raise InquiryKernelException(f'{where} topic of subject join[{join.dict()}] not found.')
	schema = topic_service.find_schema_by_name(topic.name, principal_service.get_tenant_id())
	if schema is None:
		raise InquiryKernelException(f'{where} topic schema of subject join[{join.dict()}] not found.')
	return schema


def find_topic_schemas_by_joins(
		joins: List[SubjectDatasetJoin], principal_service: PrincipalService) -> List[TopicSchema]:
	found_topics = {}

	def found(topic_id: Optional[TopicId]) -> bool:
		return topic_id is not None and topic_id in found_topics

	def find_topic_by_join(schemas: List[TopicSchema], join: SubjectDatasetJoin) -> List[TopicSchema]:
		if not found(join.topicId):
			schema = find_topic_schema(join.topicId, join, principal_service, 'Primary')
			found_topics[schema.get_topic().topicId] = schema
			schemas.append(schema)
		if not found(join.secondaryTopicId):
			schema = find_topic_schema(join.secondaryTopicId, join, principal_service, 'Secondary')
			found_topics[schema.get_topic().topicId] = schema
			schemas.append(schema)
		return schemas

	return ArrayHelper(joins).reduce(find_topic_by_join, [])


def find_topic_schemas_by_parameter(parameter: Parameter, principal_service: PrincipalService) -> List[TopicSchema]:
	# TODO
	pass


def find_topic_schemas_by_columns(
		columns: List[SubjectDatasetColumn], principal_service: PrincipalService) -> List[TopicSchema]:
	def find_each(schemas: List[TopicSchema], parameter: Parameter) -> List[TopicSchema]:
		return ArrayHelper(schemas).grab(*find_topic_schemas_by_parameter(parameter, principal_service)).to_list()

	return ArrayHelper(columns).map(lambda x: x.parameter).reduce(find_each, [])


def find_topic_schemas_by_joint(
		joint: ParameterJoint, principal_service: PrincipalService) -> List[TopicSchema]:
	filters = joint.filters
	if filters is None or len(filters) == 0:
		raise InquiryKernelException(f'Filters of joint cannot be none.')

	def find_each(schemas: List[TopicSchema], sub: ParameterCondition) -> List[TopicSchema]:
		return ArrayHelper(schemas).grab(*find_topic_schemas_by_condition(sub, principal_service)).to_list()

	return ArrayHelper(joint.filters).reduce(find_each, [])


def find_topic_schemas_by_expression(
		expression: ParameterExpression, principal_service: PrincipalService) -> List[TopicSchema]:
	left = expression.left
	if left is None:
		raise InquiryKernelException(f'Left of expression cannot be none.')
	left_schemas = find_topic_schemas_by_parameter(left, principal_service)
	operator = expression.operator
	if operator == ParameterExpressionOperator.EMPTY or operator == ParameterExpressionOperator.NOT_EMPTY:
		return left_schemas

	right = expression.right
	if right is None:
		raise InquiryKernelException(f'Right of expression cannot be none.')
	right_schemas = find_topic_schemas_by_parameter(right, principal_service)
	return ArrayHelper(left_schemas).grab(*right_schemas).to_list()


def find_topic_schemas_by_condition(
		condition: Optional[ParameterCondition], principal_service: PrincipalService) -> List[TopicSchema]:
	if condition is None:
		raise InquiryKernelException(f'Condition cannot be none.')

	if isinstance(condition, ParameterJoint):
		return find_topic_schemas_by_joint(condition, principal_service)
	elif isinstance(condition, ParameterExpression):
		return find_topic_schemas_by_expression(condition, principal_service)
	else:
		raise InquiryKernelException(f'Condition[{condition.dict()}] is not supported.')


def find_topic_schemas_by_filters(
		filters: Optional[ParameterJoint], principal_service: PrincipalService) -> List[TopicSchema]:
	if filters is None:
		return []
	return find_topic_schemas_by_condition(filters, principal_service)


def find_topic_schemas(
		columns: List[SubjectDatasetColumn], filters: Optional[ParameterJoint],
		principal_service: PrincipalService) -> List[TopicSchema]:
	schemas = find_topic_schemas_by_columns(columns, principal_service)
	schemas = ArrayHelper(schemas).grab(*find_topic_schemas_by_filters(filters, principal_service)).to_list()

	distinct_map: Dict[TopicId, TopicSchema] = {}
	for schema in schemas:
		topic_id = schema.get_topic().topicId
		if topic_id not in distinct_map:
			distinct_map[topic_id] = schema
	return list(distinct_map.values())


class SubjectSchema:
	def __init__(self, subject: Subject, principal_service: PrincipalService):
		self.subject = subject
		dataset = subject.dataset
		if dataset is None:
			raise InquiryKernelException(f'Dataset definition of subject[id={subject.subjectId}] not found.')
		columns = dataset.columns
		if columns is None or len(columns) == 0:
			raise InquiryKernelException(f'No column defined on subject[id={subject.subjectId}].')
		columns = ArrayHelper(columns).filter(lambda x: x is not None).to_list()
		if len(columns) == 0:
			raise InquiryKernelException(f'No column defined on subject[id={subject.subjectId}].')

		joins = dataset.joins
		if joins is None or len(joins) == 0:
			# single topic
			available_schemas = find_topic_schemas(columns, dataset.filters, principal_service)
		else:
			available_schemas = find_topic_schemas_by_joins(joins, principal_service)
			if len(available_schemas) == 0:
				raise InquiryKernelException(f'No topic found from given subject[id={subject.subjectId}].')
		self.available_schemas = available_schemas

	def get_subject(self):
		return self.subject
