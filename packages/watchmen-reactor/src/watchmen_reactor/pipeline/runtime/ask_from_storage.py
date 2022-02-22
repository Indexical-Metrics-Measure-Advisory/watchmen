from abc import abstractmethod
from typing import List, Optional

from watchmen_auth import PrincipalService
from watchmen_model.common import ParameterCondition, ParameterExpression, ParameterJoint, ParameterJointType
from watchmen_reactor.common import ReactorException
from watchmen_reactor.pipeline.runtime import PipelineVariables
from watchmen_utilities import ArrayHelper


class ParsedStorageCondition:
	def __init__(self, condition: ParameterCondition, principal_service: PrincipalService):
		self.condition = condition
		self.parse(condition, principal_service)

	@abstractmethod
	def parse(self, condition: ParameterCondition, principal_service: PrincipalService) -> None:
		pass

	@abstractmethod
	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> bool:
		pass


class ParsedStorageJoint(ParsedStorageCondition):
	jointType: ParameterJointType = ParameterJointType.AND
	filters: List[ParsedStorageCondition] = []

	def parse(self, condition: ParameterJoint, principal_service: PrincipalService) -> None:
		self.jointType = ParameterJointType.OR \
			if condition.jointType == ParameterJointType.OR else ParameterJointType.AND
		self.filters = ArrayHelper(condition.filters) \
			.map(lambda x: parse_condition_in_storage(x, principal_service)).to_list()

	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> bool:
		if self.jointType == ParameterJointType.OR:
			return ArrayHelper(self.filters).some(lambda x: x.run(variables, principal_service))
		else:
			# and or not given
			return ArrayHelper(self.filters).every(lambda x: x.run(variables, principal_service))


class ParsedStorageExpression(ParsedStorageCondition):
	def parse(self, condition: ParameterCondition, principal_service: PrincipalService) -> None:
		pass

	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> bool:
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
