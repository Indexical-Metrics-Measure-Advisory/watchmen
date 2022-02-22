from abc import abstractmethod
from typing import List, Optional

from watchmen_auth import PrincipalService
from watchmen_model.common import ParameterCondition, ParameterExpression, ParameterJoint, ParameterJointType
from watchmen_reactor.common import ReactorException
from watchmen_storage import EntityCriteriaExpression, EntityCriteriaJoint, \
	EntityCriteriaJointConjunction, \
	EntityCriteriaStatement
from watchmen_utilities import ArrayHelper
from .variables import PipelineVariables


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
			.map(lambda x: parse_condition_in_storage(x, principal_service)).to_list()

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


def parse_condition_in_storage(
		condition: Optional[ParameterCondition], principal_service: PrincipalService) -> ParsedStorageCondition:
	if condition is None:
		raise ReactorException('Condition cannot be null.')
	if isinstance(condition, ParameterJoint):
		return ParsedStorageJoint(condition, principal_service)
	elif isinstance(condition, ParameterExpression):
		return ParsedStorageExpression(condition, principal_service)
	else:
		raise ReactorException(f'Condition[{condition.dict()}] is not supported.')
