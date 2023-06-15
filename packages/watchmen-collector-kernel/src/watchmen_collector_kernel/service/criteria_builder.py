from typing import List, Dict, Any
from watchmen_collector_kernel.common import LEFT_BRACE, RIGHT_BRACE
from watchmen_collector_kernel.model import Condition, ConditionJoint, ConditionExpression
from watchmen_data_kernel.common import ask_all_date_formats
from watchmen_storage import EntityCriteria, EntityCriteriaExpression, ColumnNameLiteral, EntityCriteriaJoint, \
	EntityCriteriaStatement
from watchmen_utilities import ArrayHelper, is_date


class CriteriaBuilder:

	def __init__(self, variables: Dict):
		self.variables = variables

	def add_variable(self, variable_name: str, variable_value: Any):
		self.variables[variable_name] = variable_value

	def build_criteria(self, conditions: List[Condition]) -> EntityCriteria:
		return ArrayHelper(conditions).map(self.build_statement).to_list()

	def build_statement(self, condition: Condition) -> EntityCriteriaStatement:
		if isinstance(condition, ConditionJoint):
			return self.build_criteria_joint(condition)
		if isinstance(condition, ConditionExpression):
			return self.build_criteria_expression(condition)
		else:
			raise ValueError(f'Unsupported condition[{condition}].')

	def build_criteria_expression(self, condition: ConditionExpression) -> EntityCriteriaExpression:
		return EntityCriteriaExpression(left=ColumnNameLiteral(columnName=condition.columnName),
		                                operator=condition.operator,
		                                right=self.parse_condition_value(condition.columnValue))

	def build_criteria_joint(self, condition: ConditionJoint) -> EntityCriteriaJoint:
		return EntityCriteriaJoint(conjunction=condition.conjunction,
		                           children=ArrayHelper(condition.children)
		                           .map(lambda child: self.build_statement(child))
		                           .to_list())

	def parse_condition_value(self, condition_value: Any) -> Any:
		if isinstance(condition_value, str):
			if condition_value.startswith(LEFT_BRACE) and condition_value.endswith(RIGHT_BRACE):
				variable_name = condition_value.removeprefix(LEFT_BRACE).removesuffix(RIGHT_BRACE)
				variable_value = self.variables.get(variable_name)
				parsed, value = is_date(variable_value, ask_all_date_formats())
				if parsed:
					return value
				else:
					return variable_value
			else:
				return condition_value
		else:
			return condition_value
