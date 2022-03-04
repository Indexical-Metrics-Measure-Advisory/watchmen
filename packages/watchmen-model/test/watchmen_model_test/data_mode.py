from datetime import datetime
from unittest import TestCase

from watchmen_model.admin import WriteTopicActionType
from watchmen_model.admin.pipeline_action_write import InsertOrMergeRowAction, MappingFactor
from watchmen_model.common import ComputedParameter, ConstantParameter, DataModel, ParameterComputeType, \
	ParameterExpression, \
	ParameterExpressionOperator, \
	ParameterJoint, ParameterJointType, \
	ParameterKind


class DataModelTest(TestCase):
	# noinspection PyMethodMayBeStatic
	def test_to_dict(self):
		dm = DataModel(a=1, b='2', c=True, d=datetime.now())
		x = dm.to_dict()
		print(x)

		action = InsertOrMergeRowAction(
			actionId='1',
			type=WriteTopicActionType.INSERT_OR_MERGE_ROW,
			topicId='1',
			mapping=[MappingFactor(
				factorId='1',
				parameter=ConstantParameter(kind=ParameterKind.CONSTANT, value='100')
			)],
			by=ParameterJoint(
				jointType=ParameterJointType.AND,
				filters=[
					# 0
					ParameterExpression(left=ConstantParameter(value='abc'),
					                    operator=ParameterExpressionOperator.EMPTY),
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
		)
		x = action.to_dict()
		print(x)
