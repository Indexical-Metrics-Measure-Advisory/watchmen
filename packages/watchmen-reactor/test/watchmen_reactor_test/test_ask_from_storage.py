from decimal import Decimal
from unittest import TestCase

from watchmen_auth import PrincipalService
from watchmen_model.admin import User, UserRole
from watchmen_model.common import ComputedParameter, ConstantParameter, ParameterComputeType, ParameterExpression, \
	ParameterExpressionOperator, ParameterJoint, ParameterJointType
from watchmen_reactor.pipeline.runtime import parse_condition_for_storage, PipelineVariables
from watchmen_reactor.pipeline.runtime.ask_from_storage import ParsedStorageJoint
from watchmen_storage import ComputedLiteral, ComputedLiteralOperator, EntityCriteriaExpression, EntityCriteriaJoint, \
	EntityCriteriaJointConjunction, EntityCriteriaOperator


def create_fake_principal_service() -> PrincipalService:
	return PrincipalService(User(userId='1', tenantId='1', name='imma-admin', role=UserRole.ADMIN))


class AskFromStorage(TestCase):
	# noinspection PyMethodMayBeStatic
	def test_no_filter_joint(self):
		joint = ParameterJoint(jointType=ParameterJointType.AND)
		parsed_joint = parse_condition_for_storage(joint, [], create_fake_principal_service(), True)
		print(parsed_joint)

	# noinspection PyMethodMayBeStatic,PyTypeChecker
	def test_no_storage_filter(self):
		joint = ParameterJoint(
			jointType=ParameterJointType.OR,
			filters=[
				# 0
				ParameterExpression(left=ConstantParameter(value='abc'), operator=ParameterExpressionOperator.EMPTY),
				# 1
				ParameterExpression(
					left=ConstantParameter(value='2022/01'), operator=ParameterExpressionOperator.NOT_EMPTY),
				# 2
				ParameterExpression(
					left=ConstantParameter(value='2'), operator=ParameterExpressionOperator.EQUALS,
					right=ComputedParameter(
						type=ParameterComputeType.ADD,
						parameters=[
							ConstantParameter(value='0'),
							ConstantParameter(value='2')
						]
					)
				),
				# 3
				ParameterExpression(
					left=ConstantParameter(value='{items.&count}'),
					operator=ParameterExpressionOperator.NOT_EQUALS,
					right=ConstantParameter(value='{items.amount.&sum}')
				),
				# 4
				ParameterExpression(
					left=ConstantParameter(value='10'),
					operator=ParameterExpressionOperator.LESS_EQUALS,
					right=ComputedParameter(
						type=ParameterComputeType.CASE_THEN,
						parameters=[
							ConstantParameter(
								conditional=True, on=ParameterJoint(filters=[
									ParameterExpression(
										left=ConstantParameter(value='{&old.customer.name}'),
										operator=ParameterExpressionOperator.NOT_EMPTY
									)
								]),
								value='{&old.customer.name.&length}'
							),
							ConstantParameter(value='{customer.name.&length}')
						]
					)
				)
			]
		)

		principal_service = create_fake_principal_service()
		# noinspection PyTypeChecker
		parsed_joint: ParsedStorageJoint = parse_condition_for_storage(joint, [], principal_service, True)
		# print(parsed_joint)
		previous_data = {
			'items': [
				{'name': 'name-1', 'amount': 100}
			],
			'customer': {
				'name': 'customer-11'
			}
		}
		current_data = {
			'items': [
				{'name': 'name-1', 'amount': 100},
				{'name': 'name-2', 'amount': 101}
			],
			'customer': {
				'name': 'customer-1'
			}
		}
		variables = PipelineVariables(previous_data, current_data)
		result: EntityCriteriaJoint = parsed_joint.run(variables, principal_service)

		# assertion
		self.assertEqual(result.conjunction, EntityCriteriaJointConjunction.OR)
		self.assertEqual(len(result.children), 5)
		# expression 0
		exp0: EntityCriteriaExpression = result.children[0]
		self.assertIsInstance(exp0, EntityCriteriaExpression)
		self.assertEqual(exp0.left, 'abc')
		self.assertEqual(exp0.operator, EntityCriteriaOperator.IS_EMPTY)
		self.assertIsNone(exp0.right)
		# expression 1
		exp1: EntityCriteriaExpression = result.children[1]
		self.assertIsInstance(exp1, EntityCriteriaExpression)
		self.assertEqual(exp1.left, '2022/01')
		self.assertEqual(exp1.operator, EntityCriteriaOperator.IS_NOT_EMPTY)
		self.assertIsNone(exp1.right)
		# expression 2
		exp2: EntityCriteriaExpression = result.children[2]
		self.assertIsInstance(exp2, EntityCriteriaExpression)
		self.assertEqual(exp2.left, '2')
		self.assertEqual(exp2.operator, EntityCriteriaOperator.EQUALS)
		exp2_right: ComputedLiteral = exp2.right
		self.assertIsInstance(exp2_right, ComputedLiteral)
		self.assertEqual(exp2_right.operator, ComputedLiteralOperator.ADD)
		self.assertEqual(exp2_right.elements, ['0', '2'])
		# expression 3
		exp3: EntityCriteriaExpression = result.children[3]
		self.assertIsInstance(exp3, EntityCriteriaExpression)
		self.assertEqual(exp3.left, 2)
		self.assertIsInstance(exp3.left, int)
		self.assertEqual(exp3.operator, EntityCriteriaOperator.NOT_EQUALS)
		self.assertEqual(exp3.right, 201)
		self.assertIsInstance(exp3.right, Decimal)
	# expression 4
