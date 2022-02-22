from abc import abstractmethod
from typing import Any, Dict, List, Optional, Tuple

from watchmen_auth import PrincipalService
from watchmen_model.admin import AggregateArithmetic, Factor, MappingFactor, Topic
from watchmen_model.common import ComputedParameter, ConstantParameter, Parameter, ParameterCondition, \
	ParameterExpression, ParameterJoint, ParameterJointType, TopicFactorParameter
from watchmen_reactor.common import ReactorException
from watchmen_reactor.topic_schema import TopicSchema
from watchmen_storage import EntityCriteriaExpression, EntityCriteriaJoint, EntityCriteriaJointConjunction, \
	EntityCriteriaStatement
from watchmen_utilities import ArrayHelper, is_blank
from . import parse_parameter_in_memory
from .variables import PipelineVariables


class ParsedStorageParameter:
	def __init__(
			self, parameter: Parameter, available_topics: List[Topic], principal_service: PrincipalService):
		self.parameter = parameter
		self.parse(parameter, available_topics, principal_service)

	@abstractmethod
	def parse(self, parameter: Parameter, available_topics: List[Topic], principal_service: PrincipalService) -> None:
		pass

	@abstractmethod
	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		pass


class ParsedStorageTopicFactorParameter(ParsedStorageParameter):
	def parse(self, parameter: Parameter, available_topics: List[Topic], principal_service: PrincipalService) -> None:
		# TODO parse storage topic factor parameter
		pass

	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		# TODO run storage topic factor parameter
		pass


class ParsedStorageConstantParameter(ParsedStorageParameter):
	def parse(self, parameter: Parameter, available_topics: List[Topic], principal_service: PrincipalService) -> None:
		# TODO parse storage constant parameter
		pass

	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		# TODO run storage topic factor parameter
		pass


class ParsedStorageComputedParameter(ParsedStorageParameter):
	def parse(self, parameter: Parameter, available_topics: List[Topic], principal_service: PrincipalService) -> None:
		# TODO parse storage computed parameter
		pass

	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		# TODO run storage computed parameter
		pass


def parse_parameter_for_storage(
		parameter: Optional[Parameter], available_topics: List[Topic], principal_service: PrincipalService
) -> ParsedStorageParameter:
	if parameter is None:
		raise ReactorException('Parameter cannot be none.')
	elif isinstance(parameter, TopicFactorParameter):
		return ParsedStorageTopicFactorParameter(parameter, available_topics, principal_service)
	elif isinstance(parameter, ConstantParameter):
		return ParsedStorageConstantParameter(parameter, available_topics, principal_service)
	elif isinstance(parameter, ComputedParameter):
		return ParsedStorageComputedParameter(parameter, available_topics, principal_service)
	else:
		raise ReactorException(f'Parameter[{parameter.dict()}] is not supported.')


class ParsedStorageCondition:
	def __init__(self, condition: ParameterCondition, principal_service: PrincipalService):
		self.condition = condition
		self.parse(condition, principal_service)

	@abstractmethod
	def parse(self, condition: ParameterCondition, principal_service: PrincipalService) -> None:
		pass

	@abstractmethod
	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> EntityCriteriaStatement:
		pass


class ParsedStorageJoint(ParsedStorageCondition):
	jointType: ParameterJointType = ParameterJointType.AND
	filters: List[ParsedStorageCondition] = []

	def parse(self, condition: ParameterJoint, principal_service: PrincipalService) -> None:
		self.jointType = ParameterJointType.OR \
			if condition.jointType == ParameterJointType.OR else ParameterJointType.AND
		self.filters = ArrayHelper(condition.filters) \
			.map(lambda x: parse_condition_for_storage(x, principal_service)).to_list()

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
	def parse(self, condition: ParameterCondition, principal_service: PrincipalService) -> None:
		# TODO parse storage expression
		pass

	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> EntityCriteriaExpression:
		# TODO build storage expression
		pass


def parse_condition_for_storage(
		condition: Optional[ParameterCondition], principal_service: PrincipalService) -> ParsedStorageCondition:
	if condition is None:
		raise ReactorException('Condition cannot be none.')
	if isinstance(condition, ParameterJoint):
		return ParsedStorageJoint(condition, principal_service)
	elif isinstance(condition, ParameterExpression):
		return ParsedStorageExpression(condition, principal_service)
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
