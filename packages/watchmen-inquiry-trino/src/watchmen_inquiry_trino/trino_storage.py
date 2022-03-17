from datetime import date, datetime, time
from decimal import Decimal
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

from trino.dbapi import connect

from watchmen_auth import PrincipalService
from watchmen_data_kernel.cache import CacheService
from watchmen_data_kernel.meta import DataSourceService
from watchmen_model.admin import Factor, Topic
from watchmen_model.common import DataPage, FactorId, TopicId
from watchmen_storage import as_table_name, ColumnNameLiteral, ComputedLiteral, ComputedLiteralOperator, \
	FreeAggregatePager, FreeAggregator, FreeColumn, FreeFinder, FreeJoin, FreeJoinType, FreePager, Literal, \
	NoFreeJoinException, UnexpectedStorageException, UnsupportedComputationException
from watchmen_utilities import ArrayHelper, DateTimeConstants, is_blank, is_decimal
from .exception import InquiryTrinoException
from .settings import ask_trino_basic_auth, ask_trino_host
from .trino_storage_spi import TrinoStorageSPI


def get_data_source_service(principal_service: PrincipalService) -> DataSourceService:
	return DataSourceService(principal_service)


class TrinoSchema:
	def __init__(self, catalog: str, schema: str, topic: Topic):
		self.catalog = catalog
		self.schema = schema
		self.topic = topic
		self.factor_map = ArrayHelper(topic.factors).to_map(lambda x: x.factorId, lambda x: x)
		self.entity_name = f'{catalog}.{schema}.{as_table_name(topic.name)}'
		self.alias = self.entity_name

	def get_entity_name(self) -> str:
		return self.entity_name

	def assign_alias(self, alias: str) -> None:
		self.alias = alias

	def get_alias(self) -> str:
		return self.alias

	def find_factor(self, factor_id: FactorId) -> Factor:
		factor = self.factor_map.get(factor_id)
		if factor is None:
			raise InquiryTrinoException(
				f'Factor[id={factor_id}] not found in topic[id={self.topic.topicId}, name={self.topic.name}].')
		return factor


class TrinoStorageSchemas:
	def __init__(self):
		self.data = {}
		self.alias_index = 1

	def register(self, schema: TrinoSchema) -> None:
		self.data[schema.topic.topicId] = schema
		self.data[schema.topic.name] = schema
		schema.assign_alias(f'a_{self.alias_index}')
		self.alias_index = self.alias_index + 1

	def get_by_topic_id(self, topic_id: TopicId) -> Optional[TrinoSchema]:
		return self.data.get(topic_id)

	def get_by_topic_name(self, topic_name: str) -> Optional[TrinoSchema]:
		return self.data.get(topic_name)


class TrinoStorage(TrinoStorageSPI):
	def __init__(self, principal_service: PrincipalService):
		self.principalService = principal_service
		self.schemas = TrinoStorageSchemas()
		self.connection = None

	def register_topic(self, topic: Topic) -> None:
		data_source_id = topic.dataSourceId
		if is_blank(data_source_id):
			raise InquiryTrinoException(
				f'Data source is not defined for topic[id={topic.topicId}, name={topic.name}]')

		data_source = CacheService.data_source().get(data_source_id)
		if data_source is None:
			data_source = get_data_source_service(self.principalService).find_by_id(data_source_id)
			if data_source is None:
				raise InquiryTrinoException(
					f'Data source not declared for topic'
					f'[id={topic.topicId}, name={topic.name}, dataSourceId={data_source_id}]')

		self.schemas.register(TrinoSchema(catalog=data_source.dataSourceCode, schema=data_source.name, topic=topic))

	def connect(self) -> None:
		if self.connection is None:
			host, port = ask_trino_host()
			user, _ = ask_trino_basic_auth()
			self.connection = connect(host=host, port=port, user=user)

	def close(self) -> None:
		if self.connection is not None:
			conn = self.connection
			self.connection = None
			conn.close()

	def find_schema_by_id(self, topic_id: TopicId) -> TrinoSchema:
		schema = self.schemas.get_by_topic_id(topic_id)
		if schema is None:
			raise InquiryTrinoException(f'Topic[id={topic_id}] not found in given topics.')
		return schema

	def find_schema_by_name(self, topic_name: str) -> TrinoSchema:
		schema = self.schemas.get_by_topic_name(topic_name)
		if schema is None:
			raise InquiryTrinoException(f'Topic[name={topic_name}] not found in given topics.')
		return schema

	# noinspection PyMethodMayBeStatic
	def build_single_on(self, join: FreeJoin, primary_schema: TrinoSchema, secondary_schema: TrinoSchema) -> str:
		# here column name is in storage
		return \
			f'{primary_schema.get_alias()}.{join.primary.columnName} ' \
			f'= {secondary_schema.get_alias()}.{join.secondary.columnName}'

	def try_to_join(self, groups: Dict[TopicId, List[FreeJoin]], schemas: List[TrinoSchema], built: str = None) -> str:
		pending_groups: Dict[TopicId, List[FreeJoin]] = {}
		for primary_topic_id, joins_by_primary in groups.items():
			primary_schema = self.find_schema_by_id(primary_topic_id)
			if built is not None and primary_schema not in schemas:
				# primary table not used, pending to next round
				pending_groups[primary_topic_id] = joins_by_primary
			else:
				groups_by_secondary: Dict[TopicId, List[FreeJoin]] = ArrayHelper(joins_by_primary) \
					.group_by(lambda x: x.secondary.entityName)
				for secondary_topic_id, joins_by_secondary in groups_by_secondary:
					# every join is left join, otherwise reduce to inner join
					outer_join: bool = ArrayHelper(joins_by_secondary).every(lambda x: x.type == FreeJoinType.LEFT)
					secondary_schema = self.find_schema_by_id(secondary_topic_id)
					on: str = ArrayHelper(joins_by_secondary).map(
						lambda x: self.build_single_on(x, primary_schema, secondary_schema)).join(' AND ')

					join_operator = 'LEFT JOIN' if outer_join else 'INNER JOIN'
					if built is None:
						built = f'{primary_schema.get_alias()} {join_operator} {secondary_schema.get_alias()} ON {on}'
					else:
						built = f' {join_operator} {secondary_schema.get_alias()} ON {on}'
					# append into used
					if secondary_schema not in schemas:
						schemas.append(secondary_schema)
				# append into used
				if primary_schema not in schemas:
					schemas.append(primary_schema)

		if len(pending_groups) == 0:
			# all groups consumed
			return built
		if len(pending_groups) == len(groups):
			# no groups can be consumed on this round
			raise UnexpectedStorageException('Cannot join tables by given declaration.')
		# at least one group consumed, do next round
		return self.try_to_join(pending_groups, schemas, built)

	# noinspection PyMethodMayBeStatic
	def try_to_be_left_join(self, free_join: FreeJoin) -> FreeJoin:
		if free_join.type == FreeJoinType.RIGHT:
			return FreeJoin(primary=free_join.secondary, secondary=free_join.primary, type=FreeJoinType.LEFT)
		else:
			return free_join

	def build_free_joins_on_multiple(self, table_joins: Optional[List[FreeJoin]]) -> str:
		groups_by_primary: Dict[TopicId, List[FreeJoin]] = ArrayHelper(table_joins) \
			.map(self.try_to_be_left_join) \
			.group_by(lambda x: x.primary.entityName)
		return self.try_to_join(groups_by_primary, [])

	def build_free_joins(self, table_joins: Optional[List[FreeJoin]]) -> str:
		if table_joins is None or len(table_joins) == 0:
			raise NoFreeJoinException('No join found.')
		if len(table_joins) == 1:
			# single topic, here entity name is topic id
			schema = self.find_schema_by_id(table_joins[0].primary.entityName)
			return f'{schema.get_entity_name()} AS {schema.get_alias()}'
		else:
			return self.build_free_joins_on_multiple(table_joins)

	# noinspection PyMethodMayBeStatic
	def to_decimal(self, value: Any) -> str:
		if isinstance(value, (int, float, Decimal)):
			return str(value)
		elif isinstance(value, str):
			parsed, decimal_value = is_decimal(value)
			if not parsed:
				# TODO actually it is failed anyway, raise exception now?
				return f'CAST(\'{str}\' AS DECIMAL)'
			else:
				return str(decimal_value)
		else:
			raise InquiryTrinoException(f'Given value[{value}] cannot be casted to a decimal.')

	def build_literal(
			self, literal: Literal, build_plain_value: Callable[[Any], str] = None
	) -> Union[str, int, float, Decimal, bool]:
		"""
		if literal is EntityColumnValue, and it is a string, add ''.
		"""
		if isinstance(literal, ColumnNameLiteral):
			if is_blank(literal.entityName):
				raise InquiryTrinoException(f'Literal[{literal.to_dict()}] has not entity name declared.')
			else:
				# here entity name is topic name
				schema = self.find_schema_by_name(literal.entityName)
				return f'{schema.get_alias()}.{literal.columnName}'
		elif isinstance(literal, ComputedLiteral):
			operator = literal.operator
			if operator == ComputedLiteralOperator.ADD:
				return ArrayHelper(literal.elements) \
					.map(lambda x: self.build_literal(x, self.to_decimal)).join(' + ')
			elif operator == ComputedLiteralOperator.SUBTRACT:
				return ArrayHelper(literal.elements) \
					.map(lambda x: self.build_literal(x, self.to_decimal)).join(' - ')
			elif operator == ComputedLiteralOperator.MULTIPLY:
				return ArrayHelper(literal.elements) \
					.map(lambda x: self.build_literal(x, self.to_decimal)).join(' * ')
			elif operator == ComputedLiteralOperator.DIVIDE:
				return ArrayHelper(literal.elements) \
					.map(lambda x: self.build_literal(x, self.to_decimal)).join(' / ')
			elif operator == ComputedLiteralOperator.MODULUS:
				return ArrayHelper(literal.elements) \
					.map(lambda x: self.build_literal(x, self.to_decimal)).join(' % ')
			elif operator == ComputedLiteralOperator.YEAR_OF:
				return f'EXTRACT(YEAR FROM {self.build_literal(literal.elements[0])})'
			elif operator == ComputedLiteralOperator.HALF_YEAR_OF:
				return \
					f'IF(EXTRACT(MONTH FROM {self.build_literal(literal.elements[0])}) <= 6, ' \
					f'{DateTimeConstants.HALF_YEAR_FIRST.value}, ' \
					f'{DateTimeConstants.HALF_YEAR_SECOND.value})'
			elif operator == ComputedLiteralOperator.QUARTER_OF:
				return f'EXTRACT(QUARTER FROM {self.build_literal(literal.elements[0])})'
			elif operator == ComputedLiteralOperator.MONTH_OF:
				return f'EXTRACT(MONTH FROM {self.build_literal(literal.elements[0])})'
			elif operator == ComputedLiteralOperator.WEEK_OF_YEAR:
				# TODO trino week of year
				pass
			# return func.week(self.build_literal(literal.elements[0]), 0)
			elif operator == ComputedLiteralOperator.WEEK_OF_MONTH:
				# TODO trino week of month
				pass
			# return func.weekofmonth(self.build_literal(literal.elements[0]))
			elif operator == ComputedLiteralOperator.DAY_OF_MONTH:
				return f'EXTRACT(DAY_OF_MONTH FROM {self.build_literal(literal.elements[0])})'
			elif operator == ComputedLiteralOperator.DAY_OF_WEEK:
				# weekday in trino is 1: Monday - 7: Sunday, here need 1: Sunday - 7: Saturday
				return f'EXTRACT(DAY_OF_WEEK FROM {self.build_literal(literal.elements[0])}) % 7 + 1'
			elif operator == ComputedLiteralOperator.CASE_THEN:
				elements = literal.elements
				cases = ArrayHelper(elements).filter(lambda x: isinstance(x, Tuple)) \
					.map(lambda x: (self.build_criteria_statement(x[0]), self.build_literal(x[1]))) \
					.map(lambda x: f'WHEN {x[0]} THEN {x[1]}') \
					.to_list()
				anyway = ArrayHelper(elements).find(lambda x: not isinstance(x, Tuple))
				if anyway is None:
					return f'CASE {ArrayHelper(cases).join(" ")} END'
				else:
					return f'CASE {ArrayHelper(cases).join(" ")} ELSE {self.build_literal(anyway)} END'
			elif operator == ComputedLiteralOperator.CONCAT:
				return f'CONCAT({ArrayHelper(literal.elements).map(lambda x: self.build_literal(x)).join(", ")})'
			elif operator == ComputedLiteralOperator.YEAR_DIFF:
				# TODO trino year diff
				pass
			# return func.yeardiff(
			# 	self.build_literal(literal.elements[0]), self.build_literal(literal.elements[1]))
			elif operator == ComputedLiteralOperator.MONTH_DIFF:
				# TODO trino month diff
				pass
			# return func.monthdiff(
			# 	self.build_literal(literal.elements[0]), self.build_literal(literal.elements[1]))
			elif operator == ComputedLiteralOperator.DAY_DIFF:
				# trino day diff, same day returns 1.
				# in watchmen, first is end date, second is start date. exchange them when call trino function
				return \
					f'DATE_DIFF(\'day\', ' \
					f'DATE_TRUNC(\'day\', {self.build_literal(literal.elements[1])}), ' \
					f'DATE_TRUNC(\'day\', {self.build_literal(literal.elements[0])})) - 1'
			elif operator == ComputedLiteralOperator.CHAR_LENGTH:
				return f'LENGTH({self.build_literal(literal.elements[0])})'
			else:
				raise UnsupportedComputationException(f'Unsupported computation operator[{operator}].')
		elif isinstance(literal, datetime):
			formatted = literal.strftime('%Y%m%d%H%M%S')
			return f'DATE_PARSE({formatted}, \'%Y%m%d%H%i%S\')'
		elif isinstance(literal, date):
			formatted = literal.strftime('%Y%m%d')
			return f'DATE_PARSE({formatted}, \'%Y%m%d\')'
		elif isinstance(literal, time):
			formatted = literal.strftime('%H%M%S')
			return f'DATE_PARSE({formatted}, \'%H%i%S\')'
		elif build_plain_value is not None:
			return build_plain_value(literal)
		elif isinstance(literal, str):
			# a value, return itself
			return f'\'{literal}\''
		else:
			# noinspection PyTypeChecker
			return literal

	# noinspection PyMethodMayBeStatic
	def build_free_column(self, table_column: FreeColumn, index: int) -> str:
		built = self.build_literal(table_column.literal)
		return f'{built} AS column_{index + 1}'

	def build_free_columns(self, table_columns: Optional[List[FreeColumn]]) -> str:
		return ArrayHelper(table_columns) \
			.map_with_index(lambda x, index: self.build_free_column(x, index)) \
			.join(', ')

	def free_find(self, finder: FreeFinder) -> List[Dict[str, Any]]:
		sql = \
			f'SELECT {self.build_free_columns(finder.columns)} ' \
			f'FROM {self.build_free_joins(finder.joins)}'

	def free_page(self, pager: FreePager) -> DataPage:
		pass

	def free_aggregate_find(self, aggregator: FreeAggregator) -> List[Dict[str, Any]]:
		pass

	def free_aggregate_page(self, pager: FreeAggregatePager) -> DataPage:
		pass
