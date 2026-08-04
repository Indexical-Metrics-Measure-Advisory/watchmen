import sys
import unittest
from pathlib import Path


PACKAGE_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PACKAGE_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

PACKAGES_ROOT = PACKAGE_ROOT.parent
for package_dir in PACKAGES_ROOT.iterdir():
    src_dir = package_dir / "src"
    if src_dir.exists() and str(src_dir) not in sys.path:
        sys.path.insert(0, str(src_dir))


from fastapi import HTTPException

from watchmen_metricflow.ontology.space_scope import (
    build_filter_conditions_by_topic,
    joint_to_filter_conditions,
)
from watchmen_model.admin import Factor, FactorType, Space, SpaceFilter, Topic
from watchmen_model.common import (
    ConstantParameter,
    ParameterExpression,
    ParameterExpressionOperator,
    ParameterJoint,
    ParameterJointType,
    TopicFactorParameter,
)


FACTOR_NAMES = {'f-status': 'status', 'f-amount': 'amount', 'f-tenant': 'tenant_id'}


def _expression(factor_id: str, operator: ParameterExpressionOperator, value: str = None) -> ParameterExpression:
    right = ConstantParameter(value=value) if value is not None else ConstantParameter(value='')
    return ParameterExpression(
        left=TopicFactorParameter(topicId='t-1', factorId=factor_id),
        operator=operator,
        right=right,
    )


def _and_joint(*conditions) -> ParameterJoint:
    return ParameterJoint(jointType=ParameterJointType.AND, filters=list(conditions))


class JointToFilterConditionsTest(unittest.TestCase):
    def test_simple_and_joint(self):
        joint = _and_joint(
            _expression('f-status', ParameterExpressionOperator.EQUALS, 'issued'),
            _expression('f-amount', ParameterExpressionOperator.MORE_EQUALS, '100'),
        )
        conditions = joint_to_filter_conditions(joint, FACTOR_NAMES, 'test')
        self.assertEqual(2, len(conditions))
        self.assertEqual('status', conditions[0].field)
        self.assertEqual('eq', conditions[0].operator)
        self.assertEqual('issued', conditions[0].value)
        self.assertEqual('amount', conditions[1].field)
        self.assertEqual('gte', conditions[1].operator)
        self.assertEqual('100', conditions[1].value)

    def test_nested_and_is_flattened(self):
        joint = _and_joint(
            _expression('f-status', ParameterExpressionOperator.EQUALS, 'issued'),
            _and_joint(_expression('f-tenant', ParameterExpressionOperator.NOT_EQUALS, 't-9')),
        )
        conditions = joint_to_filter_conditions(joint, FACTOR_NAMES, 'test')
        self.assertEqual(2, len(conditions))
        self.assertEqual('ne', conditions[1].operator)

    def test_in_operator_splits_comma_separated_value(self):
        joint = _and_joint(_expression('f-status', ParameterExpressionOperator.IN, 'issued, renewed ,,'))
        conditions = joint_to_filter_conditions(joint, FACTOR_NAMES, 'test')
        self.assertEqual(1, len(conditions))
        self.assertEqual('in', conditions[0].operator)
        self.assertEqual(['issued', 'renewed'], conditions[0].value)

    def test_empty_and_not_empty_ignore_right_side(self):
        joint = _and_joint(
            _expression('f-status', ParameterExpressionOperator.EMPTY),
            _expression('f-amount', ParameterExpressionOperator.NOT_EMPTY),
        )
        conditions = joint_to_filter_conditions(joint, FACTOR_NAMES, 'test')
        self.assertEqual('is_null', conditions[0].operator)
        self.assertIsNone(conditions[0].value)
        self.assertEqual('is_not_null', conditions[1].operator)

    def test_or_joint_is_rejected(self):
        joint = ParameterJoint(
            jointType=ParameterJointType.OR,
            filters=[_expression('f-status', ParameterExpressionOperator.EQUALS, 'issued')],
        )
        with self.assertRaises(HTTPException) as ctx:
            joint_to_filter_conditions(joint, FACTOR_NAMES, 'test')
        self.assertEqual(400, ctx.exception.status_code)

    def test_non_topic_left_is_rejected(self):
        expression = ParameterExpression(
            left=ConstantParameter(value='x'),
            operator=ParameterExpressionOperator.EQUALS,
            right=ConstantParameter(value='y'),
        )
        with self.assertRaises(HTTPException):
            joint_to_filter_conditions(_and_joint(expression), FACTOR_NAMES, 'test')

    def test_variable_in_constant_is_rejected(self):
        joint = _and_joint(_expression('f-tenant', ParameterExpressionOperator.EQUALS, '{tenantId}'))
        with self.assertRaises(HTTPException):
            joint_to_filter_conditions(joint, FACTOR_NAMES, 'test')

    def test_unknown_factor_is_rejected(self):
        joint = _and_joint(_expression('f-unknown', ParameterExpressionOperator.EQUALS, 'x'))
        with self.assertRaises(HTTPException):
            joint_to_filter_conditions(joint, FACTOR_NAMES, 'test')

    def test_none_joint_gives_empty_list(self):
        self.assertEqual([], joint_to_filter_conditions(None, FACTOR_NAMES, 'test'))


class BuildFilterConditionsByTopicTest(unittest.TestCase):
    def _topic(self) -> Topic:
        return Topic(
            topicId='t-1',
            name='dm_policy',
            factors=[
                Factor(factorId='f-status', name='status', type=FactorType.TEXT),
                Factor(factorId='f-amount', name='amount', type=FactorType.NUMBER),
            ],
        )

    def test_enabled_filters_are_converted_and_grouped(self):
        space = Space(
            spaceId='s-1', name='demo', topicIds=['t-1'],
            filters=[
                SpaceFilter(
                    topicId='t-1', enabled=True,
                    joint=_and_joint(_expression('f-status', ParameterExpressionOperator.EQUALS, 'issued')),
                ),
                # disabled filter is skipped
                SpaceFilter(
                    topicId='t-1', enabled=False,
                    joint=_and_joint(_expression('f-amount', ParameterExpressionOperator.MORE, '0')),
                ),
            ],
        )
        conditions_by_topic = build_filter_conditions_by_topic(space, lambda topic_id: self._topic())
        self.assertEqual(['t-1'], list(conditions_by_topic.keys()))
        self.assertEqual(1, len(conditions_by_topic['t-1']))
        self.assertEqual('status', conditions_by_topic['t-1'][0].field)

    def test_no_filters_gives_empty_dict(self):
        space = Space(spaceId='s-1', name='demo', topicIds=['t-1'], filters=[])
        self.assertEqual({}, build_filter_conditions_by_topic(space, lambda topic_id: self._topic()))

    def test_missing_topic_is_rejected(self):
        space = Space(
            spaceId='s-1', name='demo', topicIds=['t-1'],
            filters=[
                SpaceFilter(
                    topicId='t-1', enabled=True,
                    joint=_and_joint(_expression('f-status', ParameterExpressionOperator.EQUALS, 'issued')),
                ),
            ],
        )
        with self.assertRaises(HTTPException):
            build_filter_conditions_by_topic(space, lambda topic_id: None)


if __name__ == '__main__':
    unittest.main()
