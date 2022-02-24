from unittest import TestCase

from watchmen_auth import PrincipalService
from watchmen_model.admin import User, UserRole
from watchmen_model.common import ComputedParameter, ConstantParameter, ParameterComputeType, ParameterExpression, \
	ParameterExpressionOperator, ParameterJoint, \
	ParameterJointType
from watchmen_reactor.pipeline.runtime import parse_condition_for_storage, PipelineVariables
from watchmen_reactor.pipeline.runtime.ask_from_storage import ParsedStorageJoint


def create_fake_principal_service() -> PrincipalService:
	return PrincipalService(User(userId='1', tenantId='1', name='imma-admin', role=UserRole.ADMIN))


class AskFromStorage(TestCase):
	# noinspection PyMethodMayBeStatic
	def test_no_filter_joint(self):
		joint = ParameterJoint(jointType=ParameterJointType.AND)
		parsed_joint = parse_condition_for_storage(joint, [], create_fake_principal_service(), True)
		print(parsed_joint)

	# noinspection PyMethodMayBeStatic
	def test_no_storage_filter(self):
		joint = ParameterJoint(
			jointType=ParameterJointType.AND,
			filters=[
				ParameterExpression(left=ConstantParameter(value='abc'), operator=ParameterExpressionOperator.EMPTY),
				ParameterExpression(
					left=ConstantParameter(value='2022/01'), operator=ParameterExpressionOperator.NOT_EMPTY),
				ParameterExpression(
					left=ConstantParameter(value='2'), operator=ParameterExpressionOperator.EQUALS,
					right=ComputedParameter(
						type=ParameterComputeType.ADD,
						parameters=[
							ConstantParameter(value='0'),
							ConstantParameter(value='2')
						]
					)
				)
			]
		)

		principal_service = create_fake_principal_service()
		# noinspection PyTypeChecker
		parsed_joint: ParsedStorageJoint = parse_condition_for_storage(joint, [], principal_service, True)
		print(parsed_joint)
		variables = PipelineVariables(None, {})
		result = parsed_joint.run(variables, principal_service)
		print(result.to_dict())
