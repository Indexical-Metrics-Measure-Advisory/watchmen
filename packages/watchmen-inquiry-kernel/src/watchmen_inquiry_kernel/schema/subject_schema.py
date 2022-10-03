from typing import Any, Dict, List, Optional

from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import TopicService
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_data_kernel.utils import MightAVariable, parse_function_in_variable, parse_variable
from watchmen_inquiry_kernel.common import InquiryKernelException
from watchmen_model.admin import Topic
from watchmen_model.common import ComputedParameter, ConstantParameter, DataSourceId, Parameter, ParameterComputeType, \
	ParameterCondition, ParameterExpression, ParameterExpressionOperator, ParameterJoint, TopicFactorParameter, \
	TopicId, VariablePredefineFunctions
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


def find_topic_schemas_by_topic_factor_parameter(
		parameter: TopicFactorParameter, principal_service: PrincipalService) -> List[TopicSchema]:
	topic_id = parameter.topicId
	if is_blank(topic_id):
		raise InquiryKernelException('Topic not declared.')
	topic_service = get_topic_service(principal_service)
	topic: Optional[Topic] = topic_service.find_by_id(topic_id)
	if topic is None:
		raise InquiryKernelException(f'Topic[id={topic_id}] not found.')
	schema = topic_service.find_schema_by_name(topic.name, topic.tenantId)
	if schema is None:
		raise InquiryKernelException(f'Topic schema[id={topic_id}] not found.')
	return [schema]


def find_topic_schemas_by_constant_parameter(
		parameter: ConstantParameter, principal_service: PrincipalService) -> List[TopicSchema]:
	value = parameter.value
	if is_blank(value):
		return []
	if '{' not in value:
		return []

	_, variables = parse_variable(value)

	topic_service = get_topic_service(principal_service)

	def find_topic_schemas_by_function_parameter(parameter_name: str) -> Optional[TopicSchema]:
		if not parameter_name.startswith('&'):
			return None

		if parameter_name.strip() == VariablePredefineFunctions.NOW:
			return None

		names = parameter_name[1:].split('.')
		if len(names) != 2:
			raise InquiryKernelException(f'Variable name[{parameter_name}] is not supported.')
		topic_name = names[0]
		schema: Optional[TopicSchema] = topic_service.find_schema_by_name(topic_name, principal_service.get_tenant_id())
		if schema is None:
			raise InquiryKernelException(f'Topic[name={topic_name}] not found.')
		return schema

	# noinspection PyTypeChecker
	def find_topic_schemas_by_variable(variable: MightAVariable) -> List[TopicSchema]:
		if not variable.has_variable():
			return []
		variable_name = variable.variable
		if variable_name.startswith(VariablePredefineFunctions.YEAR_DIFF.value):
			parsed_params = parse_function_in_variable(variable_name, VariablePredefineFunctions.YEAR_DIFF.value, 2)
		elif variable_name.startswith(VariablePredefineFunctions.MONTH_DIFF.value):
			parsed_params = parse_function_in_variable(variable_name, VariablePredefineFunctions.MONTH_DIFF.value, 2)
		elif variable_name.startswith(VariablePredefineFunctions.DAY_DIFF.value):
			parsed_params = parse_function_in_variable(variable_name, VariablePredefineFunctions.DAY_DIFF.value, 2)
		elif variable_name.startswith(VariablePredefineFunctions.MOVE_DATE.value):
			parsed_params = parse_function_in_variable(variable_name, VariablePredefineFunctions.MOVE_DATE.value, 2)
		elif variable_name.startswith(VariablePredefineFunctions.DATE_FORMAT.value):
			parsed_params = parse_function_in_variable(variable_name, VariablePredefineFunctions.DATE_FORMAT.value, 2)
		else:
			return []

		return ArrayHelper(parsed_params) \
			.map(lambda x: find_topic_schemas_by_function_parameter(x)) \
			.filter(lambda x: x is not None) \
			.to_list()

	def find_each(schemas: List[TopicSchema], variable: MightAVariable) -> List[TopicSchema]:
		return ArrayHelper(schemas).grab(*find_topic_schemas_by_variable(variable)).to_list()

	return ArrayHelper(variables).reduce(find_each, [])


def find_topic_schemas_by_computed_parameter(
		parameter: ComputedParameter, principal_service: PrincipalService) -> List[TopicSchema]:
	if parameter.parameters is None or len(parameter.parameters) == 0:
		raise InquiryKernelException(f'At least 1 parameter on computation.')

	compute_type = parameter.type
	found_schemas = []

	def find_each(schemas: List[TopicSchema], sub: Parameter) -> List[TopicSchema]:
		schemas_from_joint = []
		if compute_type == ParameterComputeType.CASE_THEN:
			if sub.conditional and sub.on is not None:
				schemas_from_joint = find_topic_schemas_by_joint(sub.on, principal_service)
		schemas_from_sub = find_topic_schemas_by_parameter(sub, principal_service)
		return ArrayHelper(schemas).grab(*schemas_from_sub).grab(*schemas_from_joint).to_list()

	return ArrayHelper(parameter.parameters).reduce(find_each, found_schemas)


def find_topic_schemas_by_parameter(
		parameter: Optional[Parameter], principal_service: PrincipalService) -> List[TopicSchema]:
	if parameter is None:
		raise InquiryKernelException('Parameter cannot be none.')
	if isinstance(parameter, TopicFactorParameter):
		return find_topic_schemas_by_topic_factor_parameter(parameter, principal_service)
	elif isinstance(parameter, ConstantParameter):
		return find_topic_schemas_by_constant_parameter(parameter, principal_service)
	elif isinstance(parameter, ComputedParameter):
		return find_topic_schemas_by_computed_parameter(parameter, principal_service)
	else:
		raise InquiryKernelException(f'Parameter[{parameter.dict()}] is not supported.')


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
		columns: List[SubjectDatasetColumn], joint: Optional[ParameterJoint],
		principal_service: PrincipalService) -> List[TopicSchema]:
	schemas = find_topic_schemas_by_columns(columns, principal_service)
	if joint is not None and joint.filters is not None and len(joint.filters) != 0:
		schemas = ArrayHelper(schemas).grab(*find_topic_schemas_by_filters(joint, principal_service)).to_list()

	distinct_map: Dict[TopicId, TopicSchema] = {}
	for schema in schemas:
		topic_id = schema.get_topic().topicId
		if topic_id not in distinct_map:
			distinct_map[topic_id] = schema
	return list(distinct_map.values())


class SubjectSchema:
	def __init__(self, subject: Subject, principal_service: PrincipalService, ignore_space: bool = False):
		self.subject = subject
		self.ignoreSpace = ignore_space
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
			available_columns = ArrayHelper(columns).filter(lambda x: not x.recalculate).to_list()
			available_schemas = find_topic_schemas(available_columns, dataset.filters, principal_service)
		else:
			available_schemas = find_topic_schemas_by_joins(joins, principal_service)
		if len(available_schemas) == 0:
			raise InquiryKernelException(f'No topic found from given subject[id={subject.subjectId}].')
		self.available_schemas = available_schemas

		data_sources: Dict[DataSourceId, bool] = {}
		for available_schema in available_schemas:
			data_source_id = available_schema.get_topic().dataSourceId
			data_sources[data_source_id] = True
		self.fromOneDataSource = len(data_sources) == 1

	def should_ignore_space(self):
		return self.ignoreSpace

	def get_subject(self) -> Subject:
		return self.subject

	def from_one_data_source(self) -> bool:
		return self.fromOneDataSource

	def get_primary_topic_schema(self) -> TopicSchema:
		return self.available_schemas[0]

	def get_available_schemas(self) -> List[TopicSchema]:
		return self.available_schemas

	def get_result_columns(self) -> List[str]:
		columns = self.get_subject().dataset.columns
		return ArrayHelper(columns).map(lambda x: x.alias).to_list()

	def translate_to_array_row(self, row: Dict[str, Any]) -> List[Any]:
		columns = self.get_subject().dataset.columns
		return ArrayHelper(columns).map(lambda x: row.get(x.alias)).to_list()

	def translate_to_array_table(self, data: List[Dict[str, Any]]) -> List[List[Any]]:
		return ArrayHelper(data).map(self.translate_to_array_row).to_list()
