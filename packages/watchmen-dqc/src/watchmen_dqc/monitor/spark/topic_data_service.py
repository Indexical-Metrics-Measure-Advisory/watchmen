from __future__ import annotations

from typing import Any, Dict, List, Optional

from pyspark.sql import DataFrame, Row, SparkSession
from pyspark.sql.functions import avg, col, count, count_distinct, length, lit, max as spark_max, \
	min as spark_min, sum as spark_sum, trim
from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import TopicService
from watchmen_data_kernel.service import ask_topic_data_service, ask_topic_storage
from watchmen_data_kernel.storage import TopicDataService
from watchmen_dqc.common import DqcException
from watchmen_model.common import TopicId
from watchmen_model.pipeline_kernel import TopicDataColumnNames
from watchmen_storage import ColumnNameLiteral, ComputedLiteral, ComputedLiteralOperator, \
	EntityColumnAggregateArithmetic, EntityCriteria, EntityCriteriaExpression, EntityCriteriaJoint, \
	EntityCriteriaJointConjunction, EntityCriteriaOperator, EntityStraightColumn


class SparkTopicDataService:
	def __init__(self, delegate: TopicDataService, spark: SparkSession):
		self.delegate = delegate
		self.spark = spark
		self._base_frame: Optional[DataFrame] = None

	def get_principal_service(self) -> PrincipalService:
		return self.delegate.get_principal_service()

	def get_topic(self):
		return self.delegate.get_topic()

	def get_data_entity_helper(self):
		return self.delegate.get_data_entity_helper()

	def exchange_to_topic(self, topic_id: TopicId) -> SparkTopicDataService:
		principal_service = self.get_principal_service()
		topic_service = TopicService(principal_service)
		topic = topic_service.find_by_id(topic_id)
		if topic is None:
			raise DqcException(f'Topic[id={topic_id}] not found.')
		schema = topic_service.find_schema_by_name(topic.name, principal_service.get_tenant_id())
		if schema is None:
			raise DqcException(f'Topic[name={topic.name}] not found.')
		storage = ask_topic_storage(schema, principal_service)
		delegate = ask_topic_data_service(schema, storage, principal_service)
		return SparkTopicDataService(delegate, self.spark)

	def count(self) -> int:
		return self._ensure_frame().count()

	def count_by_criteria(self, criteria: EntityCriteria) -> int:
		return self._apply_criteria(self._ensure_frame(), criteria).count()

	def find_distinct_values(
			self, criteria: EntityCriteria, column_names: List[str],
			distinct_value_on_single_column: bool = False) -> List[Dict[str, Any]]:
		data_frame = self._apply_criteria(self._ensure_frame(), criteria)
		columns = [col(column_name) for column_name in column_names]
		data_frame = data_frame.select(*columns)
		data_frame = data_frame.distinct()
		return [row.asDict() for row in data_frame.collect()]

	def find_straight_values(self, criteria: EntityCriteria, columns: List[EntityStraightColumn]) -> List[Dict[str, Any]]:
		data_frame = self._apply_criteria(self._ensure_frame(), criteria)

		group_columns: List[str] = []
		aggregate_columns: List[Any] = []

		for straight_column in columns:
			arithmetic = getattr(straight_column, 'arithmetic', None)
			if arithmetic is None:
				group_columns.append(straight_column.columnName)
				continue
			alias = straight_column.alias or straight_column.columnName
			if arithmetic == EntityColumnAggregateArithmetic.COUNT:
				aggregate_columns.append(count(col(straight_column.columnName)).alias(alias))
			elif arithmetic == EntityColumnAggregateArithmetic.DISTINCT_COUNT:
				aggregate_columns.append(count_distinct(col(straight_column.columnName)).alias(alias))
			elif arithmetic == EntityColumnAggregateArithmetic.SUM:
				aggregate_columns.append(spark_sum(col(straight_column.columnName)).alias(alias))
			elif arithmetic == EntityColumnAggregateArithmetic.AVG:
				aggregate_columns.append(avg(col(straight_column.columnName)).alias(alias))
			elif arithmetic == EntityColumnAggregateArithmetic.MAX:
				aggregate_columns.append(spark_max(col(straight_column.columnName)).alias(alias))
			elif arithmetic == EntityColumnAggregateArithmetic.MIN:
				aggregate_columns.append(spark_min(col(straight_column.columnName)).alias(alias))

		if len(aggregate_columns) == 0:
			selected = [col(x.columnName).alias(x.alias or x.columnName) for x in columns]
			return [row.asDict() for row in data_frame.select(*selected).collect()]

		if len(group_columns) == 0:
			aggregated = data_frame.agg(*aggregate_columns)
		else:
			aggregated = data_frame.groupBy(*[col(column_name) for column_name in group_columns]).agg(*aggregate_columns)

		projections = []
		for straight_column in columns:
			arithmetic = getattr(straight_column, 'arithmetic', None)
			if arithmetic is None:
				projections.append(col(straight_column.columnName).alias(straight_column.alias or straight_column.columnName))
			else:
				alias = straight_column.alias or straight_column.columnName
				projections.append(col(alias))
		return [row.asDict() for row in aggregated.select(*projections).collect()]

	def _ensure_frame(self) -> DataFrame:
		if self._base_frame is not None:
			return self._base_frame

		helper = self.get_data_entity_helper()
		topic = self.get_topic()
		column_names = [helper.get_column_name(factor.name) for factor in topic.factors]
		reserved = [
			TopicDataColumnNames.ID.value,
			TopicDataColumnNames.TENANT_ID.value,
			TopicDataColumnNames.INSERT_TIME.value,
			TopicDataColumnNames.UPDATE_TIME.value
		]
		for reserved_name in reserved:
			if reserved_name not in column_names:
				column_names.append(reserved_name)
		straight_columns = [EntityStraightColumn(columnName=x) for x in column_names]
		rows = self.delegate.find_straight_values(criteria=[], columns=straight_columns)
		if len(rows) == 0:
			self._base_frame = self.spark.createDataFrame([], ','.join([f'{x} string' for x in column_names]))
		else:
			self._base_frame = self.spark.createDataFrame([Row(**row) for row in rows])
		return self._base_frame

	def _apply_criteria(self, data_frame: DataFrame, criteria: EntityCriteria) -> DataFrame:
		if criteria is None or len(criteria) == 0:
			return data_frame
		condition = None
		for statement in criteria:
			current = self._build_statement(statement)
			if current is None:
				continue
			condition = current if condition is None else (condition & current)
		return data_frame.where(condition) if condition is not None else data_frame

	def _build_statement(self, statement):
		if isinstance(statement, EntityCriteriaExpression):
			return self._build_expression(statement)
		if isinstance(statement, EntityCriteriaJoint):
			condition = None
			for child in statement.children:
				current = self._build_statement(child)
				if current is None:
					continue
				if condition is None:
					condition = current
				elif statement.conjunction == EntityCriteriaJointConjunction.OR:
					condition = condition | current
				else:
					condition = condition & current
			return condition
		return None

	def _resolve_literal(self, value):
		if isinstance(value, ColumnNameLiteral):
			return col(value.columnName)
		if isinstance(value, ComputedLiteral):
			if value.operator == ComputedLiteralOperator.CHAR_LENGTH and len(value.elements) == 1:
				return length(self._resolve_literal(value.elements[0]).cast('string'))
		return value

	def _build_expression(self, expression: EntityCriteriaExpression):
		left = self._resolve_literal(expression.left)
		right = self._resolve_literal(expression.right)
		operator = expression.operator

		if operator == EntityCriteriaOperator.IS_EMPTY:
			return left.isNull() | (left == lit(''))
		if operator == EntityCriteriaOperator.IS_NOT_EMPTY:
			return left.isNotNull() & (left != lit(''))
		if operator == EntityCriteriaOperator.IS_BLANK:
			return left.isNull() | (trim(left.cast('string')) == lit(''))
		if operator == EntityCriteriaOperator.IS_NOT_BLANK:
			return left.isNotNull() & (trim(left.cast('string')) != lit(''))
		if operator == EntityCriteriaOperator.EQUALS:
			return left == right
		if operator == EntityCriteriaOperator.NOT_EQUALS:
			return left != right
		if operator == EntityCriteriaOperator.LESS_THAN:
			return left < right
		if operator == EntityCriteriaOperator.LESS_THAN_OR_EQUALS:
			return left <= right
		if operator == EntityCriteriaOperator.GREATER_THAN:
			return left > right
		if operator == EntityCriteriaOperator.GREATER_THAN_OR_EQUALS:
			return left >= right
		if operator == EntityCriteriaOperator.IN:
			return left.isin(right if isinstance(right, list) else [right])
		if operator == EntityCriteriaOperator.NOT_IN:
			return ~left.isin(right if isinstance(right, list) else [right])
		return left == right
