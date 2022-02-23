from abc import abstractmethod
from typing import Any, Callable, Dict, List, Optional, Tuple

from watchmen_auth import PrincipalService
from watchmen_model.admin import AggregateArithmetic, Factor, is_raw_topic, MappingFactor, Topic
from watchmen_model.common import ComputedParameter, ConstantParameter, FactorId, Parameter, ParameterCondition, \
	ParameterExpression, ParameterExpressionOperator, ParameterJoint, ParameterJointType, TopicFactorParameter, TopicId
from watchmen_reactor.common import ReactorException
from watchmen_reactor.meta import TopicService
from watchmen_reactor.topic_schema import TopicSchema
from watchmen_storage import EntityCriteriaExpression, EntityCriteriaJoint, EntityCriteriaJointConjunction, \
	EntityCriteriaOperator, EntityCriteriaStatement
from watchmen_utilities import ArrayHelper, is_blank
from .ask_from_memory import create_ask_factor_value, parse_parameter_in_memory
from .variables import PipelineVariables


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


class ParsedStorageParameter:
	def __init__(
			self, parameter: Parameter, available_schemas: List[TopicSchema],
			principal_service: PrincipalService, allow_in_memory_variables: bool):
		self.parameter = parameter
		self.parse(parameter, available_schemas, principal_service, allow_in_memory_variables)

	# noinspection PyMethodMayBeStatic
	def find_topic(
			self, topic_id: Optional[TopicId], available_schemas: List[TopicSchema],
			principal_service: PrincipalService, allow_in_memory_variables: bool) -> Tuple[Topic, bool]:
		"""
		find topic even it is not found in available list when in-memory variables is allowed.
		for the secondary one of return tuple, true when it is found in given available list,
		otherwise is false, means it can be find in definitions
		"""
		if is_blank(topic_id):
			raise ReactorException(f'Topic not declared.')
		topic = ArrayHelper(available_schemas).map(lambda x: x.get_topic()).find(lambda x: x.topicId == topic_id)
		if topic is None:
			if not allow_in_memory_variables:
				raise ReactorException(f'Topic[id={topic_id}] not found.')
			else:
				topic_service = get_topic_service(principal_service)
				topic: Optional[Topic] = topic_service.find_by_id(topic_id)
				if topic is None:
					raise ReactorException(f'Topic[id={topic_id}] not found.')
				else:
					return topic, False
		else:
			return topic, True

	# noinspection PyMethodMayBeStatic
	def find_factor(self, factor_id: Optional[FactorId], topic: Topic) -> Factor:
		if is_blank(factor_id):
			raise ReactorException(f'Factor not declared.')
		factor: Optional[Factor] = ArrayHelper(topic.factors).find(lambda x: x.factorId == factor_id)
		if factor is None:
			raise ReactorException(f'Factor[id={factor_id}] in topic[id={topic.topicId}, name={topic.name}] not found.')
		return factor

	@abstractmethod
	def parse(
			self, parameter: Parameter, available_schemas: List[TopicSchema],
			principal_service: PrincipalService, allow_in_memory_variables: bool) -> None:
		pass

	@abstractmethod
	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		pass


class ParsedStorageTopicFactorParameter(ParsedStorageParameter):
	topic: Topic = None
	topicFromVariables: bool = False
	factor: Factor = None
	askValue: Callable[[PipelineVariables, PrincipalService], Any] = None

	def parse(
			self, parameter: Parameter, available_schemas: List[TopicSchema],
			principal_service: PrincipalService, allow_in_memory_variables: bool) -> None:
		topic, from_variables = self.find_topic(
			parameter.topic_id, available_schemas, principal_service, allow_in_memory_variables)
		self.topic = topic
		self.topicFromVariables = from_variables
		factor = self.find_factor(parameter.factor_id, topic)
		self.factor = factor
		if not from_variables and is_raw_topic(topic) and not factor.flatten:
			raise ReactorException(
				f'Factor[id={factor.factorId}, name={factor.name}] '
				f'on topic[id={topic.topicId}, name={topic.name}] is not flatten, '
				f'cannot be used on storage directly.')

		if from_variables:
			# get value from memory
			self.askValue = create_ask_factor_value(topic, factor)
		else:
			self.askValue = create_ask_factor_statement(topic, factor)

	# build for storage

	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		# TODO run storage topic factor parameter
		pass


class ParsedStorageConstantParameter(ParsedStorageParameter):
	def parse(
			self, parameter: Parameter, available_schemas: List[TopicSchema],
			principal_service: PrincipalService, allow_in_memory_variables: bool) -> None:
		# TODO parse storage constant parameter
		pass

	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		# TODO run storage topic factor parameter
		pass


class ParsedStorageComputedParameter(ParsedStorageParameter):
	def parse(
			self, parameter: Parameter, available_schemas: List[TopicSchema],
			principal_service: PrincipalService, allow_in_memory_variables: bool) -> None:
		# TODO parse storage computed parameter
		pass

	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		# TODO run storage computed parameter
		pass


def parse_parameter_for_storage(
		parameter: Optional[Parameter], available_topics: List[TopicSchema],
		principal_service: PrincipalService, allow_in_memory_variables: bool
) -> ParsedStorageParameter:
	if parameter is None:
		raise ReactorException('Parameter cannot be none.')
	elif isinstance(parameter, TopicFactorParameter):
		return ParsedStorageTopicFactorParameter(parameter, available_topics, principal_service,
		                                         allow_in_memory_variables)
	elif isinstance(parameter, ConstantParameter):
		return ParsedStorageConstantParameter(parameter, available_topics, principal_service, allow_in_memory_variables)
	elif isinstance(parameter, ComputedParameter):
		return ParsedStorageComputedParameter(parameter, available_topics, principal_service, allow_in_memory_variables)
	else:
		raise ReactorException(f'Parameter[{parameter.dict()}] is not supported.')


class ParsedStorageCondition:
	def __init__(
			self, schema: TopicSchema, condition: ParameterCondition,
			principal_service: PrincipalService, allow_in_memory_variables: bool):
		self.condition = condition
		self.parse(schema, condition, principal_service, allow_in_memory_variables)

	@abstractmethod
	def parse(
			self, schema: TopicSchema, condition: ParameterCondition,
			principal_service: PrincipalService, allow_in_memory_variables: bool) -> None:
		pass

	@abstractmethod
	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> EntityCriteriaStatement:
		pass


class ParsedStorageJoint(ParsedStorageCondition):
	jointType: ParameterJointType = ParameterJointType.AND
	filters: List[ParsedStorageCondition] = []

	def parse(
			self, schema: TopicSchema, condition: ParameterJoint,
			principal_service: PrincipalService, allow_in_memory_variables: bool) -> None:
		self.jointType = ParameterJointType.OR \
			if condition.jointType == ParameterJointType.OR else ParameterJointType.AND
		self.filters = ArrayHelper(condition.filters) \
			.map(lambda x: parse_condition_for_storage(schema, x, principal_service, allow_in_memory_variables)) \
			.to_list()

	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> EntityCriteriaJoint:
		if self.jointType == ParameterJointType.OR:
			return EntityCriteriaJoint(
				conjunction=EntityCriteriaJointConjunction.OR,
				filters=ArrayHelper(self.filters).map(lambda x: x.run(variables, principal_service)).to_list()
			)
		else:
			# and or not given
			return EntityCriteriaJoint(
				conjunction=EntityCriteriaJointConjunction.AND,
				filters=ArrayHelper(self.filters).map(lambda x: x.run(variables, principal_service)).to_list()
			)


class ParsedStorageExpression(ParsedStorageCondition):
	left: Optional[ParsedStorageParameter] = None
	operator: Optional[ParameterExpressionOperator] = None
	right: Optional[ParsedStorageParameter] = None

	def parse(
			self, schema: TopicSchema, condition: ParameterCondition,
			principal_service: PrincipalService, allow_in_memory_variables: bool) -> None:
		self.left = parse_parameter_for_storage(condition.left, [schema], principal_service, allow_in_memory_variables)
		self.operator = condition.operator
		self.right = parse_parameter_for_storage(
			condition.right, [schema], principal_service, allow_in_memory_variables)

	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> EntityCriteriaExpression:
		left_value = self.left.run(variables, principal_service)
		if self.operator == ParameterExpressionOperator.EMPTY:
			return EntityCriteriaExpression(left=left_value, operator=EntityCriteriaOperator.IS_EMPTY)
		elif self.operator == ParameterExpressionOperator.NOT_EMPTY:
			return EntityCriteriaExpression(left=left_value, operator=EntityCriteriaOperator.IS_NOT_EMPTY)

		right_value = self.right.run(variables, principal_service)
		if self.operator == ParameterExpressionOperator.EQUALS:
			return EntityCriteriaExpression(
				left=left_value,
				operator=EntityCriteriaOperator.EQUALS,
				right=right_value
			)
		elif self.operator == ParameterExpressionOperator.NOT_EQUALS:
			return EntityCriteriaExpression(
				left=left_value,
				operator=EntityCriteriaOperator.NOT_EQUALS,
				right=right_value
			)
		elif self.operator == ParameterExpressionOperator.LESS:
			return EntityCriteriaExpression(
				left=left_value,
				operator=EntityCriteriaOperator.LESS_THAN,
				right=right_value
			)
		elif self.operator == ParameterExpressionOperator.LESS_EQUALS:
			return EntityCriteriaExpression(
				left=left_value,
				operator=EntityCriteriaOperator.LESS_THAN_OR_EQUALS,
				right=right_value
			)
		elif self.operator == ParameterExpressionOperator.MORE:
			return EntityCriteriaExpression(
				left=left_value,
				operator=EntityCriteriaOperator.GREATER_THAN,
				right=right_value
			)
		elif self.operator == ParameterExpressionOperator.MORE_EQUALS:
			return EntityCriteriaExpression(
				left=left_value,
				operator=EntityCriteriaOperator.GREATER_THAN_OR_EQUALS,
				right=right_value
			)
		elif self.operator == ParameterExpressionOperator.IN:
			return EntityCriteriaExpression(
				left=left_value,
				operator=EntityCriteriaOperator.IN,
				right=right_value
			)
		elif self.operator == ParameterExpressionOperator.NOT_IN:
			return EntityCriteriaExpression(
				left=left_value,
				operator=EntityCriteriaOperator.NOT_IN,
				right=right_value
			)
		else:
			raise ReactorException(
				f'Operator[{self.operator}] is not supported, found from expression[{self.condition.dict()}].')


def parse_condition_for_storage(
		schema: TopicSchema,
		condition: Optional[ParameterCondition], principal_service: PrincipalService,
		allow_in_memory_variables: bool) -> ParsedStorageCondition:
	if condition is None:
		raise ReactorException('Condition cannot be none.')
	if isinstance(condition, ParameterJoint):
		return ParsedStorageJoint(schema, condition, principal_service, allow_in_memory_variables)
	elif isinstance(condition, ParameterExpression):
		return ParsedStorageExpression(schema, condition, principal_service, allow_in_memory_variables)
	else:
		raise ReactorException(f'Condition[{condition.dict()}] is not supported.')


class ParsedStorageMappingFactor:
	def __init__(self, schema: TopicSchema, mapping_factor: MappingFactor, principal_service: PrincipalService):
		self.mappingFactor = mapping_factor
		self.arithmetic = AggregateArithmetic.NONE if mapping_factor.arithmetic is None else mapping_factor.arithmetic
		factor_id = mapping_factor.factorId
		if is_blank(factor_id):
			raise ReactorException('Factor not declared on mapping.')
		topic = schema.get_topic()
		factor: Optional[Factor] = ArrayHelper(topic.factors).find(lambda x: x.factorId == factor_id)
		if factor is None:
			raise ReactorException(
				f'Factor[id={factor_id}] in topic[id={topic.topicId}, name={topic.name}] not found.')
		self.factor = factor
		self.columnName = factor.name.strip().lower()
		if mapping_factor.source is None:
			raise ReactorException('Source of mapping factor not declared.')
		# parameter in mapping factor always retrieve value from variables
		self.parsedParameter = parse_parameter_in_memory(mapping_factor.source, principal_service)

	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> Tuple[str, Any]:
		value = self.parsedParameter.value(variables, principal_service)
		# TODO parse factor value to applicable type
		name = self.columnName
		return name, value


class ParsedStorageMapping:
	def __init__(
			self, schema: TopicSchema,
			mapping: Optional[List[MappingFactor]], principal_service: PrincipalService):
		self.mapping = mapping
		if mapping is None:
			raise ReactorException('Mapping cannot be none.')
		if len(mapping) == 0:
			raise ReactorException('At least one mapping is required.')
		self.parsedMappingFactors = ArrayHelper(mapping).map(
			lambda x: ParsedStorageMappingFactor(schema, x, principal_service)).to_list()

	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> Dict[str, Any]:
		# TODO need original value when there are aggregation existing
		return ArrayHelper(self.parsedMappingFactors).reduce(
			lambda data, x: self.run_factor(data, x, variables, principal_service), {})

	# noinspection PyMethodMayBeStatic
	def run_factor(
			self, data: Dict[str, Any], parsed_factor: ParsedStorageMappingFactor,
			variables: PipelineVariables, principal_service: PrincipalService) -> Dict[str, Any]:
		key, value = parsed_factor.run(variables, principal_service)
		data[key] = value
		return data


def parse_mapping_for_storage(
		schema: TopicSchema,
		mapping: Optional[List[MappingFactor]], principal_service: PrincipalService) -> ParsedStorageMapping:
	return ParsedStorageMapping(schema, mapping, principal_service)
