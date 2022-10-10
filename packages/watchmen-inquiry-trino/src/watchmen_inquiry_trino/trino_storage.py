from datetime import date, datetime, time
from decimal import Decimal
from logging import getLogger
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

from trino.auth import Authentication, BasicAuthentication
from trino.dbapi import connect

from watchmen_auth import PrincipalService
from watchmen_data_kernel.cache import CacheService
from watchmen_data_kernel.common import ask_storage_echo_enabled
from watchmen_data_kernel.meta import DataSourceService
from watchmen_data_kernel.utils import parse_move_date_pattern
from watchmen_model.admin import Factor, Topic
from watchmen_model.common import DataPage, FactorId, TopicId
from watchmen_storage import as_table_name, ColumnNameLiteral, ComputedLiteral, ComputedLiteralOperator, \
	EntityCriteria, EntityCriteriaExpression, EntityCriteriaJoint, EntityCriteriaJointConjunction, \
	EntityCriteriaOperator, EntityCriteriaStatement, EntitySortColumn, EntitySortMethod, FreeAggregateArithmetic, \
	FreeAggregateColumn, FreeAggregatePager, FreeAggregator, FreeColumn, FreeFinder, FreeJoin, FreeJoinType, \
	FreePager, Literal, NoCriteriaForUpdateException, NoFreeJoinException, UnexpectedStorageException, \
	UnsupportedComputationException, UnsupportedCriteriaException
from watchmen_utilities import ArrayHelper, DateTimeConstants, is_blank, is_decimal, is_not_blank
from .exception import InquiryTrinoException
from .settings import ask_trino_auth_type, ask_trino_basic_auth, ask_trino_host, ask_trino_need_auth, ask_trino_user, \
	AuthenticationType
from .trino_storage_spi import TrinoStorageSPI

logger = getLogger(__name__)


def get_data_source_service(principal_service: PrincipalService) -> DataSourceService:
	return DataSourceService(principal_service)


class TrinoSchema:
	def __init__(self, catalog: str, schema: str, topic: Topic):
		self.catalog = catalog
		self.schema = schema
		self.topic = topic
		self.factor_map = ArrayHelper(topic.factors).to_map(lambda x: x.factorId, lambda x: x)
		self.entity_name = f'{catalog}.{schema}.{as_table_name(topic)}'
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


# noinspection DuplicatedCode
DATE_FORMAT_MAPPING = {
	'Y': '%Y',  # 4 digits year
	'y': '%y',  # 2 digits year
	'M': '%m',  # 2 digits month
	'D': '%d',  # 2 digits day of month
	'h': '%H',  # 2 digits hour, 00 - 23
	'H': '%h',  # 2 digits hour, 01 - 12
	'm': '%i',  # 2 digits minute
	's': '%S',  # 2 digits second
	'W': '%W',  # Monday - Sunday
	'w': '%a',  # Mon - Sun
	'B': '%M',  # January - December
	'b': '%b',  # Jan - Dec
	'p': '%p'  # AM/PM
}


def translate_date_format(date_format: str) -> str:
	return ArrayHelper(list(DATE_FORMAT_MAPPING)) \
		.reduce(lambda original, x: original.replace(x, DATE_FORMAT_MAPPING[x]), date_format)


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

	@staticmethod
	def auth() -> Authentication:
		if ask_trino_auth_type() == AuthenticationType.PASSWORD:
			user, _ = ask_trino_basic_auth()
			return BasicAuthentication(user, _)
		else:
			# todo
			raise InquiryTrinoException(f'auth type {ask_trino_auth_type()} is not supported')

	def connect(self) -> None:
		if self.connection is None:
			host, port = ask_trino_host()
			if ask_trino_need_auth():
				auth = TrinoStorage.auth()
				user = ask_trino_user()
				self.connection = connect(http_scheme="https", host=host, port=port, user=user, auth=auth)
			else:
				user = ask_trino_user()
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
				for secondary_topic_id, joins_by_secondary in groups_by_secondary.items():
					# every join is left join, otherwise reduce to inner join
					outer_join: bool = ArrayHelper(joins_by_secondary).every(lambda x: x.type == FreeJoinType.LEFT)
					secondary_schema = self.find_schema_by_id(secondary_topic_id)
					on: str = ArrayHelper(joins_by_secondary).map(
						lambda x: self.build_single_on(x, primary_schema, secondary_schema)).join(' AND ')

					join_operator = 'LEFT JOIN' if outer_join else 'INNER JOIN'
					if built is None:
						built = \
							f'{primary_schema.get_entity_name()} AS {primary_schema.get_alias()} ' \
							f'{join_operator} ' \
							f'{secondary_schema.get_entity_name()} AS {secondary_schema.get_alias()} ON {on} '
					else:
						built = \
							f'{built} {join_operator} ' \
							f'{secondary_schema.get_entity_name()} AS {secondary_schema.get_alias()} ON {on}'
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
		if len(table_joins) == 1 and table_joins[0].secondary is None:
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
				return f'CAST({value} AS DECIMAL)'
			else:
				return str(decimal_value)
		else:
			raise InquiryTrinoException(f'Given value[{value}] cannot be casted to a decimal.')

	def build_literal(
			self, literal: Literal, build_plain_value: Callable[[Any], str] = None
	) -> Union[str, int, float, Decimal, bool]:
		if isinstance(literal, ColumnNameLiteral):
			if is_blank(literal.entityName):
				# build column name which have sub query. in this case, no entity name is needed.
				return literal.columnName
			else:
				# here entity name is topic name
				schema = self.find_schema_by_name(literal.entityName)
				return f'{schema.get_alias()}.{literal.columnName}'
		elif isinstance(literal, ComputedLiteral):
			operator = literal.operator
			if operator == ComputedLiteralOperator.ADD:
				return ArrayHelper(literal.elements).map(lambda x: self.to_decimal(self.build_literal(x))).join(' + ')
			elif operator == ComputedLiteralOperator.SUBTRACT:
				return ArrayHelper(literal.elements).map(lambda x: self.to_decimal(self.build_literal(x))).join(' - ')
			elif operator == ComputedLiteralOperator.MULTIPLY:
				return ArrayHelper(literal.elements).map(lambda x: self.to_decimal(self.build_literal(x))).join(' * ')
			elif operator == ComputedLiteralOperator.DIVIDE:
				exp = ArrayHelper(literal.elements).map(lambda x: self.to_decimal(self.build_literal(x))).join(' / ')
				return f'1.0 * {exp}'
			elif operator == ComputedLiteralOperator.MODULUS:
				return ArrayHelper(literal.elements).map(lambda x: self.to_decimal(self.build_literal(x))).join(' % ')
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
				built = self.build_literal(literal.elements[0])
				# days left after exclude days of zero week of year
				days_of_zero_week = f'7 - EXTRACT(DAY_OF_WEEK FROM DATE_TRUNC(\'year\', {built}))'
				days_exclude_zero_week = f'EXTRACT(DAY_OF_YEAR FROM ({built})) - ({days_of_zero_week})'
				return f'CAST(CEIL(({days_exclude_zero_week}) / CAST(7 AS DOUBLE)) AS INTEGER)'
			elif operator == ComputedLiteralOperator.WEEK_OF_MONTH:
				built = self.build_literal(literal.elements[0])
				# days left after exclude days of zero week of month
				days_of_zero_week = f'7 - EXTRACT(DAY_OF_WEEK FROM DATE_TRUNC(\'month\', {built}))'
				days_exclude_zero_week = f'EXTRACT(DAY FROM ({built})) - ({days_of_zero_week})'
				return f'CAST(CEIL(({days_exclude_zero_week}) / CAST(7 AS DOUBLE)) AS INTEGER)'
			elif operator == ComputedLiteralOperator.DAY_OF_MONTH:
				return f'EXTRACT(DAY_OF_MONTH FROM {self.build_literal(literal.elements[0])})'
			elif operator == ComputedLiteralOperator.DAY_OF_WEEK:
				# weekday in trino is 1: Monday - 7: Sunday, here need 1: Sunday - 7: Saturday
				return f'EXTRACT(DAY_OF_WEEK FROM {self.build_literal(literal.elements[0])}) % 7 + 1'
			elif operator == ComputedLiteralOperator.CASE_THEN:
				elements = literal.elements
				cases = ArrayHelper(elements).filter(lambda x: isinstance(x, Tuple)) \
					.map(lambda x: (self.build_criteria_statement(x[0]), self.build_literal(x[1]))) \
					.map(lambda x: f'WHEN {x[0]} THEN CAST({x[1]} AS VARCHAR)') \
					.to_list()
				anyway = ArrayHelper(elements).find(lambda x: not isinstance(x, Tuple))
				if anyway is None:
					return f'CASE {ArrayHelper(cases).join(" ")} END'
				else:
					return f'CASE {ArrayHelper(cases).join(" ")} ELSE CAST({self.build_literal(anyway)} AS VARCHAR) END'
			elif operator == ComputedLiteralOperator.CONCAT:
				return f'CONCAT({ArrayHelper(literal.elements).map(lambda x: self.build_literal(x)).join(", ")})'
			elif operator == ComputedLiteralOperator.YEAR_DIFF:
				return \
					f'DATE_DIFF(\'year\', ' \
					f'DATE_TRUNC(\'day\', {self.build_literal(literal.elements[1])}), ' \
					f'DATE_TRUNC(\'day\', {self.build_literal(literal.elements[0])}))'
			elif operator == ComputedLiteralOperator.MONTH_DIFF:
				return \
					f'DATE_DIFF(\'month\', ' \
					f'DATE_TRUNC(\'day\', {self.build_literal(literal.elements[1])}), ' \
					f'DATE_TRUNC(\'day\', {self.build_literal(literal.elements[0])}))'
			elif operator == ComputedLiteralOperator.DAY_DIFF:
				return \
					f'DATE_DIFF(\'day\', ' \
					f'DATE_TRUNC(\'day\', {self.build_literal(literal.elements[1])}), ' \
					f'DATE_TRUNC(\'day\', {self.build_literal(literal.elements[0])}))'
			elif operator == ComputedLiteralOperator.MOVE_DATE:
				# cannot add customized function into trino
				# split
				move_to_pattern = parse_move_date_pattern(literal.elements[1])

				def build_params(segment: Tuple[str, str, str]) -> str:
					loc = {'Y': 1, 'M': 2, 'D': 3, 'h': 4, 'm': 5, 's': 6}.get(segment[0])
					# set -> 0, add -> 1, subtract -> -1
					cmd = 0 if segment[1] == '' else (1 if segment[1] == '+' else -1)
					value = int(segment[2])
					if cmd == 1:
						# no computing flags
						return f'ARRAY[{loc}, {cmd}, {value}]'
					elif cmd == -1:
						# use negative value if it is subtracting
						return f'ARRAY[{loc}, {cmd}, -{value}]'

					# -1 means subtract original value,
					# 1 means add new value (which is the value at index 3 in array)
					# 0 means no need to compute
					elif loc == 1:
						# year
						return f'ARRAY[1, 0, {value}, -1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]'
					elif loc == 2:
						# month
						value = 1 if value < 1 else (12 if value > 12 else value)
						return f'ARRAY[2, 0, {value}, 0, 0, -1, 1, 0, 0, 0, 0, 0, 0, 0, 0]'
					elif loc == 3:
						# day of month
						value = 1 if value < 1 else (31 if value > 31 else value)
						return f'ARRAY[3, 0, {value}, 0, 0, 0, 0, -1, 1, 0, 0, 0, 0, 0, 0]'
					elif loc == 4:
						# hour
						value = 0 if value < 0 else (23 if value > 23 else value)
						return f'ARRAY[4, 0, {value}, 0, 0, 0, 0, 0, 0, -1, 1, 0, 0, 0, 0]'
					elif loc == 5:
						# minute
						value = 0 if value < 0 else (59 if value > 59 else value)
						return f'ARRAY[5, 0, {value}, 0, 0, 0, 0, 0, 0, 0, 0, -1, 1, 0, 0]'
					elif loc == 6:
						# second
						value = 0 if value < 0 else (59 if value > 59 else value)
						return f'ARRAY[6, 0, {value}, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1, 1]'
					else:
						raise UnexpectedStorageException(
							f'Location[{segment[0]}] of move date command is not supported.')

				# reduce function on pattern array
				patterns = ArrayHelper(move_to_pattern).map(build_params).join(', ')
				initial = self.build_literal(literal.elements[0])
				# compute new date according to given values
				set_year = "DATE_ADD('year', YEAR(s) * ELEMENT_AT(x, 4) + ELEMENT_AT(x, 3) * ELEMENT_AT(x, 5), s)"
				set_month = f"DATE_ADD('month', MONTH(s) * ELEMENT_AT(x, 6) + ELEMENT_AT(x, 3) * ELEMENT_AT(x, 7), {set_year})"
				set_day = f"DATE_ADD('day', DAY(s) * ELEMENT_AT(x, 8) + ELEMENT_AT(x, 3) * ELEMENT_AT(x, 9), {set_month})"
				# compute new date according to given values, but ensure will not to cross month
				# max value if end day of month
				set_day_1 = "DATE_ADD('day', DAY(s) * -1 + 1, s)"
				set_year_day_1 = f"DATE_ADD('year', YEAR(s) * ELEMENT_AT(x, 4) + ELEMENT_AT(x, 3) * ELEMENT_AT(x, 5), {set_day_1})"
				set_next_month_day_1 = \
					f"DATE_ADD('month', " \
					f"MONTH(s) * ELEMENT_AT(x, 6) + ELEMENT_AT(x, 3) * ELEMENT_AT(x, 7) + 1, {set_year_day_1})"
				end_day_of_month = f"DATE_ADD('day', -1, {set_next_month_day_1})"
				# get the least date from above two
				least_day = f'LEAST({end_day_of_month}, {set_day})'
				# compute time part
				set_hour = f"DATE_ADD('hour', HOUR(s) * ELEMENT_AT(x, 10) + ELEMENT_AT(x, 3) * ELEMENT_AT(x, 11), {least_day})"
				set_minute = f"DATE_ADD('minute', MINUTE(s) * ELEMENT_AT(x, 12) + ELEMENT_AT(x, 3) * ELEMENT_AT(x, 13), {set_hour})"
				set_second = \
					f"DATE_ADD('second', " \
					f"SECOND(s) * ELEMENT_AT(x, 14) + ELEMENT_AT(x, 3) * ELEMENT_AT(x, 15), {set_minute})"
				set_func = set_second
				# add/subtract routines are same, value are passed via array. value is negative when do subtract
				add_or_sub_func = \
					"DATE_ADD(ELEMENT_AT(ARRAY['year', 'month', 'day', 'hour', 'minute', 'second'], " \
					"ELEMENT_AT(x, 1)), ELEMENT_AT(x, 3), s)"
				func_body = f'CASE WHEN ELEMENT_AT(x, 2) = 0 THEN {set_func} ELSE {add_or_sub_func} END'
				func = f'(s, x) -> {func_body}'

				return f'REDUCE(ARRAY[{patterns}], {initial}, {func}, s -> s)'
			elif operator == ComputedLiteralOperator.FORMAT_DATE:
				return \
					f'DATE_FORMAT({self.build_literal(literal.elements[0])}, ' \
					f'\'{translate_date_format(literal.elements[1])}\')'
			elif operator == ComputedLiteralOperator.CHAR_LENGTH:
				return f'LENGTH({self.build_literal(literal.elements[0])})'
			else:
				raise UnsupportedComputationException(f'Unsupported computation operator[{operator}].')
		elif isinstance(literal, datetime):
			formatted = literal.strftime('%Y%m%d%H%M%S')
			return f'DATE_PARSE(\'{formatted}\', \'%Y%m%d%H%i%S\')'
		elif isinstance(literal, date):
			formatted = literal.strftime('%Y%m%d')
			return f'DATE_PARSE(\'{formatted}\', \'%Y%m%d\')'
		elif isinstance(literal, time):
			formatted = literal.strftime('%H%M%S')
			return f'DATE_PARSE(\'{formatted}\', \'%H%i%S\')'
		elif build_plain_value is not None:
			return build_plain_value(literal)
		elif isinstance(literal, str):
			# a value, return itself
			replaced = literal.replace('\'', '\'\'')
			return f'\'{replaced}\''
		else:
			# noinspection PyTypeChecker
			return literal

	# noinspection PyMethodMayBeStatic
	def build_like_pattern(self, to_be_pattern: str) -> str:
		if isinstance(to_be_pattern, str):
			if to_be_pattern.startswith('\''):
				to_be_pattern = to_be_pattern[1:]
			if to_be_pattern.endswith('\''):
				to_be_pattern = to_be_pattern[:-1]
		to_be_pattern = to_be_pattern.lower()
		to_be_pattern = to_be_pattern.replace('\'', '\'\'')
		to_be_pattern = to_be_pattern.replace('_', '\\_')
		to_be_pattern = to_be_pattern.replace('%', '\\%')
		return f'%{to_be_pattern.lower()}%'

	def build_criteria_expression(self, expression: EntityCriteriaExpression) -> str:
		built_left = self.build_literal(expression.left)
		op = expression.operator
		if op == EntityCriteriaOperator.IS_EMPTY:
			return f'{built_left} IS NULL OR CAST({built_left} AS VARCHAR) = \'\''
		elif op == EntityCriteriaOperator.IS_NOT_EMPTY:
			return f'{built_left} IS NOT NULL AND CAST({built_left} AS VARCHAR) != \'\''
		elif op == EntityCriteriaOperator.IS_BLANK:
			return f'TRIM({built_left}) = \'\''
		elif op == EntityCriteriaOperator.IS_NOT_BLANK:
			return f'TRIM({built_left}) != \'\''

		if op == EntityCriteriaOperator.IN or op == EntityCriteriaOperator.NOT_IN:
			if isinstance(expression.right, ColumnNameLiteral):
				raise UnsupportedCriteriaException(
					'In or not-in criteria expression on another column is not supported.')
			elif isinstance(expression.right, ComputedLiteral):
				if expression.right.operator == ComputedLiteralOperator.CASE_THEN:
					# TODO cannot know whether the built literal will returns a list or a value, let it be now.
					built_right = self.build_literal(expression.right)
				else:
					# any other computation will not lead a list
					built_right = [self.build_literal(expression.right)]
			elif isinstance(expression.right, str):
				built_right = ArrayHelper(expression.right.strip().split(',')).filter(
					lambda x: is_not_blank(x)).to_list()
			else:
				built_right = self.build_literal(expression.right)
				if not isinstance(built_right, list):
					built_right = [built_right]
			if op == EntityCriteriaOperator.IN:
				return f'{built_left} IN ({ArrayHelper(built_right).map(lambda x: self.build_literal(x)).join(", ")})'
			elif op == EntityCriteriaOperator.NOT_IN:
				return f'{built_left} NOT IN ({ArrayHelper(built_right).map(lambda x: self.build_literal(x)).join(", ")})'

		built_right = self.build_literal(expression.right)
		if op == EntityCriteriaOperator.EQUALS:
			return f'{built_left} = {built_right}'
		elif op == EntityCriteriaOperator.NOT_EQUALS:
			return f'{built_left} != {built_right}'
		elif op == EntityCriteriaOperator.LESS_THAN:
			return f'{built_left} < {built_right}'
		elif op == EntityCriteriaOperator.LESS_THAN_OR_EQUALS:
			return f'{built_left} <= {built_right}'
		elif op == EntityCriteriaOperator.GREATER_THAN:
			return f'{built_left} > {built_right}'
		elif op == EntityCriteriaOperator.GREATER_THAN_OR_EQUALS:
			return f'{built_left} >= {built_right}'
		elif op == EntityCriteriaOperator.LIKE:
			return f'LOWER({built_left}) LIKE \'{self.build_like_pattern(built_right)}\' ESCAPE \'\\\''
		elif op == EntityCriteriaOperator.NOT_LIKE:
			return f'LOWER({built_left}) NOT LIKE \'{self.build_like_pattern(built_right)}\' ESCAPE \'\\\''
		else:
			raise UnsupportedCriteriaException(f'Unsupported criteria expression operator[{op}].')

	def build_criteria_joint(self, joint: EntityCriteriaJoint) -> str:
		conjunction = joint.conjunction
		if conjunction == EntityCriteriaJointConjunction.AND:
			return ArrayHelper(joint.children).map(lambda x: self.build_criteria_statement(x)) \
				.map(lambda x: f'({x})').join(' AND ')
		elif conjunction == EntityCriteriaJointConjunction.OR:
			return ArrayHelper(joint.children).map(lambda x: self.build_criteria_statement(x)) \
				.map(lambda x: f'({x})').join(' OR ')
		else:
			raise UnsupportedCriteriaException(f'Unsupported criteria joint conjunction[{conjunction}].')

	def build_criteria_statement(self, statement: EntityCriteriaStatement) -> str:
		if isinstance(statement, EntityCriteriaExpression):
			return self.build_criteria_expression(statement)
		elif isinstance(statement, EntityCriteriaJoint):
			return self.build_criteria_joint(statement)
		else:
			raise UnsupportedCriteriaException(f'Unsupported criteria[{statement}].')

	# noinspection PyMethodMayBeStatic
	def build_free_column(self, table_column: FreeColumn, index: int, ignore_recalculate: bool = True) -> Optional[str]:
		"""
		return none when given column is declared as recalculate
		"""
		if ignore_recalculate and table_column.recalculate:
			return None

		built = self.build_literal(table_column.literal)
		return f'{built} AS column_{index + 1}'

	def build_free_columns(self, table_columns: Optional[List[FreeColumn]]) -> str:
		"""
		recalculate columns are ignored
		"""
		return ArrayHelper(table_columns) \
			.map_with_index(lambda x, index: self.build_free_column(x, index)) \
			.filter(lambda x: x is not None) \
			.join(', ')

	def build_criteria(self, criteria: EntityCriteria):
		if criteria is None or len(criteria) == 0:
			return None

		if len(criteria) == 1:
			return self.build_criteria_statement(criteria[0])
		else:
			return self.build_criteria_statement(EntityCriteriaJoint(children=criteria))

	def build_criteria_for_statement(
			self, criteria: EntityCriteria, raise_exception_on_missed: bool = False) -> Optional[str]:
		where = self.build_criteria(criteria)
		if where is not None:
			return where
		elif raise_exception_on_missed:
			raise NoCriteriaForUpdateException(f'No criteria found from[{criteria}].')
		else:
			return None

	# noinspection PyMethodMayBeStatic
	def deserialize_from_row(self, row: List[Any], columns: List[FreeColumn]) -> Dict[str, Any]:
		data: Dict[str, Any] = {}
		for index, column in enumerate(columns):
			data[column.alias] = row[index]
		return data

	# noinspection PyMethodMayBeStatic,DuplicatedCode
	def fake_aggregate_columns(self, table_columns: List[FreeColumn]) -> Tuple[bool, List[FreeAggregateColumn]]:
		"""
		find aggregate columns from given table columns. recalculate columns are transformed as none.
		this method is not for high order columns
		"""
		aggregated = ArrayHelper(table_columns) \
			.some(lambda x: x.arithmetic is not None and x.arithmetic != FreeAggregateArithmetic.NONE)
		if not aggregated:
			return False, []
		else:
			def as_column(column: FreeColumn, index: int) -> Optional[FreeAggregateColumn]:
				if column.recalculate:
					return None
				else:
					return FreeAggregateColumn(
						name=f'column_{index + 1}',
						arithmetic=column.arithmetic,
						alias=column.alias
					)

			return True, ArrayHelper(table_columns).map_with_index(as_column).to_list()

	# noinspection PyMethodMayBeStatic
	def build_aggregate_group_by(
			self, table_columns: List[Optional[FreeAggregateColumn]]) -> Tuple[bool, Optional[str]]:
		"""
		column might be none when list is faked
		"""
		# find columns rather than grouped
		non_group_columns = ArrayHelper(table_columns) \
			.filter(lambda x: x is not None) \
			.filter(lambda x: x.arithmetic is None or x.arithmetic == FreeAggregateArithmetic.NONE) \
			.to_list()
		if len(non_group_columns) != 0 and len(non_group_columns) != len(table_columns):
			# add group by only when non group columns and group columns both existing
			sql = f'{ArrayHelper(non_group_columns).map(lambda x: x.name).join(", ")}'
			return True, sql
		else:
			return False, None

	def build_fake_aggregate_columns(self, table_columns: List[FreeColumn], sql: str) -> str:
		"""
		use sub query to do free columns aggregate to avoid group by computation
		"""
		aggregated, aggregate_columns = self.fake_aggregate_columns(table_columns)
		if aggregated:
			# noinspection SqlResolve
			sql = f'SELECT {self.build_free_aggregate_columns(aggregate_columns, "column")} FROM ({sql}) AS FQ '
			has_group_by, group_by = self.build_aggregate_group_by(aggregate_columns)
			if has_group_by:
				sql = f'{sql} GROUP BY {group_by}'
		return sql

	def build_recalculate_sql(self, table_columns: List[FreeColumn], sql: str) -> str:
		if not ArrayHelper(table_columns).some(lambda x: x.recalculate):
			# no recalculate column existing
			return sql

		def build_column(column: FreeColumn, index: int) -> str:
			name = f'column_{index + 1}'
			if not column.recalculate:
				# use original column
				return name
			else:
				# build recalculate column
				return self.build_free_column(column, index, False)

		def build_columns() -> str:
			return ArrayHelper(table_columns).map_with_index(lambda x, index: build_column(x, index)).join(', ')

		return f'SELECT {build_columns()} FROM ({sql}) AS AQ'

	def build_find_sql(self, finder: FreeFinder) -> str:
		# build base query
		# noinspection SqlResolve
		sql = f'SELECT {self.build_free_columns(finder.columns)} FROM {self.build_free_joins(finder.joins)}'
		where = self.build_criteria_for_statement(finder.criteria)
		if where is not None:
			sql = f'{sql} WHERE {where}'
		# build aggregate query
		sql = self.build_fake_aggregate_columns(finder.columns, sql)
		# build when recalculate columns existing
		return self.build_recalculate_sql(finder.columns, sql)

	def free_find(self, finder: FreeFinder) -> List[Dict[str, Any]]:
		data_sql = self.build_find_sql(finder)
		cursor = self.connection.cursor()
		self.log_sql(data_sql)
		cursor.execute(data_sql)
		rows = cursor.fetchall()
		return ArrayHelper(rows).map(lambda x: self.deserialize_from_row(x, finder.columns)).to_list()

	# noinspection PyMethodMayBeStatic
	def compute_page(self, count: int, page_size: int, page_number: int) -> Tuple[int, int]:
		"""
		first: page number; second: max page number
		"""
		pages = count / page_size
		max_page_number = int(pages)
		if pages > max_page_number:
			max_page_number += 1
		if page_number > max_page_number:
			page_number = max_page_number
		return page_number, max_page_number

	# noinspection SqlResolve,DuplicatedCode
	def free_page(self, pager: FreePager) -> DataPage:
		page_size = pager.pageable.pageSize

		data_sql = self.build_find_sql(pager)

		aggregated, aggregate_columns = self.fake_aggregate_columns(pager.columns)
		aggregate_column_count = 0
		if aggregated:
			aggregate_column_count = ArrayHelper(aggregate_columns) \
				.filter(lambda x: x is not None) \
				.filter(lambda x: x.arithmetic is not None and x.arithmetic != FreeAggregateArithmetic.NONE) \
				.size()
		has_group_by = aggregate_column_count != len(pager.columns) and aggregate_column_count != 0
		if aggregated and not has_group_by:
			count = 1
		else:
			cursor = self.connection.cursor()
			count_sql = f'SELECT COUNT(1) FROM ({data_sql}) AS CQ'
			self.log_sql(count_sql)
			cursor.execute(count_sql)
			count = cursor.fetchall()[0][0]

		if count == 0:
			return DataPage(
				data=[],
				pageNumber=1,
				pageSize=page_size,
				itemCount=0,
				pageCount=0
			)

		page_number, max_page_number = self.compute_page(count, page_size, pager.pageable.pageNumber)

		offset = page_size * (page_number - 1)
		data_sql = f'{data_sql} OFFSET {offset} LIMIT {page_size}'
		cursor = self.connection.cursor()
		self.log_sql(data_sql)
		cursor.execute(data_sql)
		rows = cursor.fetchall()

		results = ArrayHelper(rows).map(lambda x: self.deserialize_from_row(x, pager.columns)).to_list()

		return DataPage(
			data=results,
			pageNumber=page_number,
			pageSize=page_size,
			itemCount=count,
			pageCount=max_page_number
		)

	# noinspection PyMethodMayBeStatic
	def build_free_aggregate_column(
			self, table_column: FreeAggregateColumn, index: int, prefix_name: str) -> str:
		name = table_column.name
		alias = f'{prefix_name}_{index + 1}'
		arithmetic = table_column.arithmetic
		if arithmetic == FreeAggregateArithmetic.COUNT:
			return f'COUNT(1) AS {alias}'
		elif arithmetic == FreeAggregateArithmetic.SUMMARY:
			return f'SUM({self.to_decimal(name)}) AS {alias}'
		elif arithmetic == FreeAggregateArithmetic.AVERAGE:
			return f'AVG({self.to_decimal(name)}) AS {alias}'
		elif arithmetic == FreeAggregateArithmetic.MAXIMUM:
			return f'MAX({self.to_decimal(name)}) AS {alias}'
		elif arithmetic == FreeAggregateArithmetic.MINIMUM:
			return f'MIN({self.to_decimal(name)}) AS {alias}'
		elif arithmetic == FreeAggregateArithmetic.NONE or arithmetic is None:
			return f'{name} AS {alias}'
		else:
			raise UnexpectedStorageException(f'Aggregate arithmetic[{arithmetic}] is not supported.')

	def build_free_aggregate_columns(
			self, table_columns: Optional[List[Optional[FreeAggregateColumn]]], prefix_name: str = 'agg_column') -> str:
		"""
		note when columns are faked, there might be none is columns list.
		keep none in list is for keep the column index is correct
		"""

		def build_column(column: Optional[FreeAggregateColumn], index: int) -> Optional[str]:
			if column is None:
				return None
			else:
				return self.build_free_aggregate_column(column, index, prefix_name)

		return ArrayHelper(table_columns).map_with_index(build_column).filter(lambda x: x is not None).join(', ')

	# noinspection SqlResolve
	def build_aggregate_statement(self, aggregator: FreeAggregator) -> Tuple[bool, str]:
		# build base query
		sub_query_sql = f'SELECT {self.build_free_columns(aggregator.columns)} FROM {self.build_free_joins(aggregator.joins)}'
		where = self.build_criteria_for_statement(aggregator.criteria)
		if where is not None:
			sub_query_sql = f'{sub_query_sql} WHERE {where}'
		# build aggregate query
		sub_query_sql = self.build_fake_aggregate_columns(aggregator.columns, sub_query_sql)
		# build when recalculate columns existing
		sub_query_sql = self.build_recalculate_sql(aggregator.columns, sub_query_sql)
		sub_query_sql = f'({sub_query_sql}) AS SQ'
		# build high-order aggregate query
		aggregate_columns = aggregator.highOrderAggregateColumns
		sql = f'SELECT {self.build_free_aggregate_columns(aggregate_columns)} FROM {sub_query_sql}'
		# obviously, table is not existing. fake a table of sub query selection to build high order criteria
		where = self.build_criteria_for_statement(aggregator.highOrderCriteria)
		if where is not None:
			sql = f'{sql} WHERE {where}'
		# find columns rather than grouped
		has_group_by, group_by = self.build_aggregate_group_by(aggregate_columns)
		if has_group_by:
			sql = f'{sql} GROUP BY {group_by}'
			return True, sql
		else:
			return False, sql

	# noinspection PyMethodMayBeStatic
	def deserialize_from_aggregate_row(
			self, row: List[Any], columns: List[FreeAggregateColumn]) -> Dict[str, Any]:
		data: Dict[str, Any] = {}
		for index, column in enumerate(columns):
			alias = column.alias if is_not_blank(column.alias) else column.name
			data[alias] = row[index]
		return data

	# noinspection PyMethodMayBeStatic
	def build_aggregate_order_by(self, columns: Optional[List[EntitySortColumn]]) -> Optional[str]:
		if columns is None or len(columns) == 0:
			return None

		def as_sort_method(column: EntitySortColumn) -> str:
			if column.method == EntitySortMethod.ASC:
				return ''
			else:
				return ' DESC'

		return ArrayHelper(columns).map(lambda x: f'{x.name}{as_sort_method(x)}').join(', ')

	def free_aggregate_find(self, aggregator: FreeAggregator) -> List[Dict[str, Any]]:
		_, data_sql = self.build_aggregate_statement(aggregator)
		order_by = self.build_aggregate_order_by(aggregator.highOrderSortColumns)
		if order_by is not None:
			data_sql = f'{data_sql} ORDER BY {order_by}'
		if aggregator.highOrderTruncation is not None and aggregator.highOrderTruncation > 0:
			data_sql = f'{data_sql} LIMIT {aggregator.highOrderTruncation}'
		cursor = self.connection.cursor()
		self.log_sql(data_sql)
		cursor.execute(data_sql)
		rows = cursor.fetchall()
		return ArrayHelper(rows) \
			.map(lambda x: self.deserialize_from_aggregate_row(x, aggregator.highOrderAggregateColumns)).to_list()

	# noinspection PyMethodMayBeStatic
	def log_sql(self, sql: str):
		if ask_storage_echo_enabled():
			logger.info(f'SQL: {sql}')

	# noinspection PyMethodMayBeStatic
	def has_aggregate_column(self, table_columns: List[FreeAggregateColumn]) -> bool:
		return ArrayHelper(table_columns) \
			.some(lambda x: x.arithmetic is not None and x.arithmetic != FreeAggregateArithmetic.NONE)

	# noinspection PyMethodMayBeStatic
	def has_group_by_column(self, table_columns: List[FreeAggregateColumn]) -> bool:
		return ArrayHelper(table_columns) \
			.some(lambda x: x.arithmetic is None or x.arithmetic == FreeAggregateArithmetic.NONE)

	# noinspection DuplicatedCode
	def free_aggregate_page(self, pager: FreeAggregatePager) -> DataPage:
		page_size = pager.pageable.pageSize

		_, data_sql = self.build_aggregate_statement(pager)

		aggregated = self.has_aggregate_column(pager.highOrderAggregateColumns)
		has_group_by = self.has_group_by_column(pager.highOrderAggregateColumns)
		if aggregated and not has_group_by:
			count = 1
		else:
			cursor = self.connection.cursor()
			count_sql = f'SELECT COUNT(1) FROM ({data_sql}) AS CQ'
			self.log_sql(count_sql)
			cursor.execute(count_sql)
			result = cursor.fetchall()
			if result:
				count = result[0][0]
			else:
				count = 0
			if count == 0:
				return DataPage(
					data=[],
					pageNumber=1,
					pageSize=page_size,
					itemCount=0,
					pageCount=0
				)

		order_by = self.build_aggregate_order_by(pager.highOrderSortColumns)
		if order_by is not None:
			data_sql = f'{data_sql} ORDER BY {order_by}'
		page_number, max_page_number = self.compute_page(count, page_size, pager.pageable.pageNumber)
		offset = page_size * (page_number - 1)
		data_sql = f'{data_sql} OFFSET {offset} LIMIT {page_size}'
		cursor = self.connection.cursor()
		self.log_sql(data_sql)
		cursor.execute(data_sql)
		rows = cursor.fetchall()

		results = ArrayHelper(rows) \
			.map(lambda x: self.deserialize_from_aggregate_row(x, pager.highOrderAggregateColumns)).to_list()

		return DataPage(
			data=results,
			pageNumber=page_number,
			pageSize=page_size,
			itemCount=count,
			pageCount=max_page_number
		)
