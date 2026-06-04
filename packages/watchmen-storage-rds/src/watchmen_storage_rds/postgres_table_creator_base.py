"""
Shared base for PostgreSQL-compatible table creators (PostgreSQL, DSQL, ...).

Subclasses override class attributes or the small number of methods that
differ between flavours:

* ``id_column_type``            -- the SQL type used for the ``id_`` PK column
  (BIGINT for PostgreSQL, VARCHAR(64) for DSQL).
* ``index_async``               -- whether index DDL uses the Aurora DSQL
  ``CREATE INDEX ASYNC`` extension.
* ``qualified_table_identifier`` -- wraps a table name as ``"schema"."table"``
  when the flavour supports / requires it.

All other logic -- FactorTypeMap, column-name normalisation, raw / aggregate
column building, unique / non-unique index groups, ``CREATE TABLE`` shape --
lives here once.
"""
from typing import Callable, Dict, List, Optional, Tuple, Union

from watchmen_model.admin import Factor, FactorType, is_aggregation_topic, is_raw_topic, Topic
from watchmen_storage import as_table_name
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank


class PostgreSQLTableCreatorBase:
	# ---- flavour-specific knobs (override in subclasses) -----------------
	id_column_type: str = 'BIGINT'
	index_async: bool = False

	# Override to return a ``"schema"."table"`` identifier. Default: bare
	# table name. DSQL overrides this to honour an explicit schema.
	def qualified_table_identifier(self, table_name: str, schema: Optional[str]) -> str:
		return table_name

	# Override to produce the DDL fragment for a single column ALTER.
	# The default is the standard PostgreSQL ``ADD (...)`` / ``ALTER COLUMN``
	# multi-column form. DSQL overrides to single-column ``ADD COLUMN``.
	def alter_add_column(self, qualified_entity: str, column_name: str, column_type: str) -> str:
		return f'ALTER TABLE {qualified_entity} ADD ({column_name} {column_type})'

	def alter_modify_column(self, qualified_entity: str, column_name: str, column_type: str) -> str:
		return f'ALTER TABLE {qualified_entity} ALTER COLUMN ({column_name} TYPE {column_type})'

	# ---- shared column helpers ------------------------------------------
	def ask_column_name(self, factor: Factor) -> str:
		return factor.name.strip().lower().replace('.', '_').replace('-', '_').replace(' ', '_')

	@staticmethod
	def varchar_column(precision: str) -> str:
		return f'VARCHAR({precision})'

	@staticmethod
	def varchar_10(precision: Optional[str] = '10') -> str:
		return PostgreSQLTableCreatorBase.varchar_column('10' if is_blank(precision) else precision)

	@staticmethod
	def varchar_20(precision: Optional[str] = '20') -> str:
		return PostgreSQLTableCreatorBase.varchar_column('20' if is_blank(precision) else precision)

	@staticmethod
	def varchar_50(precision: Optional[str] = '50') -> str:
		return PostgreSQLTableCreatorBase.varchar_column('50' if is_blank(precision) else precision)

	@staticmethod
	def varchar_100(precision: Optional[str] = '100') -> str:
		return PostgreSQLTableCreatorBase.varchar_column('100' if is_blank(precision) else precision)

	@staticmethod
	def varchar_255(precision: Optional[str] = '255') -> str:
		return PostgreSQLTableCreatorBase.varchar_column('255' if is_blank(precision) else precision)

	@staticmethod
	def decimal_column(precision: str) -> str:
		return f'DECIMAL({precision})'

	@staticmethod
	def decimal_10_2(precision: Optional[str] = '10,2') -> str:
		return PostgreSQLTableCreatorBase.decimal_column('10,2' if is_blank(precision) else precision)

	@staticmethod
	def decimal_32_6(precision: Optional[str] = '32,6') -> str:
		return PostgreSQLTableCreatorBase.decimal_column('32,6' if is_blank(precision) else precision)

	# ---- FactorTypeMap ---------------------------------------------------
	# Subclasses override only the entries that differ (e.g. SEQUENCE).
	FactorTypeMap: Dict[FactorType, Union[str, Callable[[Optional[str]], str]]] = {
		FactorType.SEQUENCE: 'BIGINT',

		FactorType.NUMBER: decimal_32_6,
		FactorType.UNSIGNED: decimal_32_6,

		FactorType.TEXT: varchar_255,

		FactorType.ADDRESS: 'VARCHAR(1024)',
		FactorType.CONTINENT: varchar_10,
		FactorType.REGION: varchar_10,
		FactorType.COUNTRY: varchar_10,
		FactorType.PROVINCE: varchar_10,
		FactorType.CITY: varchar_10,
		FactorType.DISTRICT: varchar_255,
		FactorType.ROAD: varchar_255,
		FactorType.COMMUNITY: varchar_100,
		FactorType.FLOOR: 'SMALLINT',
		FactorType.RESIDENCE_TYPE: varchar_10,
		FactorType.RESIDENTIAL_AREA: decimal_10_2,

		FactorType.EMAIL: varchar_100,
		FactorType.PHONE: varchar_50,
		FactorType.MOBILE: varchar_50,
		FactorType.FAX: varchar_50,

		FactorType.DATETIME: 'TIMESTAMP',
		FactorType.FULL_DATETIME: 'TIMESTAMP',
		FactorType.DATE: 'DATE',
		FactorType.TIME: 'TIME',
		FactorType.YEAR: 'SMALLINT',
		FactorType.HALF_YEAR: 'SMALLINT',
		FactorType.QUARTER: 'SMALLINT',
		FactorType.MONTH: 'SMALLINT',
		FactorType.HALF_MONTH: 'SMALLINT',
		FactorType.TEN_DAYS: 'SMALLINT',
		FactorType.WEEK_OF_YEAR: 'SMALLINT',
		FactorType.WEEK_OF_MONTH: 'SMALLINT',
		FactorType.HALF_WEEK: 'SMALLINT',
		FactorType.DAY_OF_MONTH: 'SMALLINT',
		FactorType.DAY_OF_WEEK: 'SMALLINT',
		FactorType.DAY_KIND: 'SMALLINT',
		FactorType.HOUR: 'SMALLINT',
		FactorType.HOUR_KIND: 'SMALLINT',
		FactorType.MINUTE: 'SMALLINT',
		FactorType.SECOND: 'SMALLINT',
		FactorType.MILLISECOND: 'SMALLINT',
		FactorType.AM_PM: 'SMALLINT',

		FactorType.GENDER: varchar_10,
		FactorType.OCCUPATION: varchar_10,
		FactorType.DATE_OF_BIRTH: 'DATE',
		FactorType.AGE: 'SMALLINT',
		FactorType.ID_NO: varchar_50,
		FactorType.RELIGION: varchar_10,
		FactorType.NATIONALITY: varchar_10,

		FactorType.BIZ_TRADE: varchar_10,
		FactorType.BIZ_SCALE: 'DECIMAL(9)',

		FactorType.BOOLEAN: 'SMALLINT',

		FactorType.ENUM: varchar_20,

		FactorType.OBJECT: 'JSON',
		FactorType.ARRAY: 'JSON'
	}

	def ask_column_type(self, factor: Factor) -> str:
		column_type = self.FactorTypeMap.get(factor.type)
		if isinstance(column_type, str):
			return column_type
		elif is_blank(factor.precision):
			return column_type()
		else:
			return column_type(factor.precision.strip())

	# ---- CREATE TABLE / ALTER TABLE / INDEX builders --------------------
	def build_columns(self, topic: Topic) -> str:
		if is_raw_topic(topic):
			flatten_factors = ArrayHelper(topic.factors) \
				.filter(lambda x: x.flatten) \
				.map(lambda x: f'\t{self.ask_column_name(x)} {self.ask_column_type(x)},') \
				.to_list()
			if len(flatten_factors) == 0:
				return '\tdata_ JSON,'
			else:
				return '\n'.join(flatten_factors) + '\n\tdata_ JSON,'
		else:
			return ArrayHelper(topic.factors) \
				.filter(lambda x: '.' not in x.name) \
				.map(lambda x: f'\t{self.ask_column_name(x)} {self.ask_column_type(x)},') \
				.join('\n')

	@staticmethod
	def build_aggregate_assist_column(topic: Topic) -> str:
		return f'\taggregate_assist_ JSON,' if is_aggregation_topic(topic) else ''

	@staticmethod
	def build_version_column(topic: Topic) -> str:
		return f'\tversion_ INTEGER,' if is_aggregation_topic(topic) else ''

	def build_table_script(self, topic: Topic, schema: Optional[str] = None) -> str:
		entity_name = as_table_name(topic)
		qualified_entity = self.qualified_table_identifier(entity_name, schema)
		return f'''
CREATE TABLE {qualified_entity} (
\tid_ {self.id_column_type},
{self.build_columns(topic)}
{self.build_aggregate_assist_column(topic)}
{self.build_version_column(topic)}
\ttenant_id_ VARCHAR(50),
\tinsert_time_ TIMESTAMP,
\tupdate_time_ TIMESTAMP,
\tCONSTRAINT pk_{entity_name} PRIMARY KEY (id_)
)'''

	def _index_keyword(self) -> str:
		"""Return ``ASYNC`` when the flavour wants async index DDL, else ````."""
		return 'ASYNC ' if self.index_async else ''

	def build_columns_script(self, topic: Topic, original_topic: Topic, schema: Optional[str] = None) -> List[str]:
		entity_name = as_table_name(topic)
		qualified_entity = self.qualified_table_identifier(entity_name, schema)
		original_factors: Dict[str, Factor] = ArrayHelper(original_topic.factors) \
			.to_map(lambda x: x.name.strip().lower(), lambda x: x)

		def build_column_script(factor: Tuple[Factor, Optional[Factor]]) -> str:
			current_factor, original_factor = factor
			column_name = self.ask_column_name(factor[0])
			column_type = self.ask_column_type(factor[0])
			if original_factor is None:
				return self.alter_add_column(qualified_entity, column_name, column_type)
			elif current_factor.flatten and not original_factor.flatten:
				return self.alter_add_column(qualified_entity, column_name, column_type)
			else:
				return self.alter_modify_column(qualified_entity, column_name, column_type)

		if is_raw_topic(topic):
			factors = ArrayHelper(topic.factors) \
				.filter(lambda x: x.flatten) \
				.to_list()
		else:
			factors = topic.factors

		columns = ArrayHelper(factors) \
			.map(lambda x: (x, original_factors.get(x.name.strip().lower()))) \
			.map(build_column_script) \
			.to_list()

		# These two special-column ALTERs are not part of the factor loop;
		# keep them on the single-column form regardless of flavour so that
		# raw / aggregate topic transitions work on both PostgreSQL and DSQL.
		if is_raw_topic(topic) and not is_raw_topic(original_topic):
			columns.append(f'ALTER TABLE {qualified_entity} ADD COLUMN data_ JSON')

		if is_aggregation_topic(topic) and not is_aggregation_topic(original_topic):
			columns.append(f'ALTER TABLE {qualified_entity} ADD COLUMN aggregate_assist_ JSON')
			columns.append(f'ALTER TABLE {qualified_entity} ADD COLUMN version_ INTEGER')

		return columns

	def build_unique_indexes_script(self, topic: Topic, schema: Optional[str] = None) -> List[str]:
		index_groups: Dict[str, List[Factor]] = ArrayHelper(topic.factors) \
			.filter(lambda x: is_not_blank(x.indexGroup) and x.indexGroup.startswith('u-')) \
			.group_by(lambda x: x.indexGroup)
		qualified_entity = self.qualified_table_identifier(as_table_name(topic), schema)
		async_kw = self._index_keyword()

		def build_unique_index(factors: List[Factor], index: int) -> str:
			return \
				f'CREATE UNIQUE INDEX {async_kw}u_{as_table_name(topic)}_{index + 1} ON {qualified_entity} ' \
				f'({ArrayHelper(factors).map(lambda x: self.ask_column_name(x)).join(",")})'

		return ArrayHelper(list(index_groups.values())) \
			.map_with_index(lambda x, index: build_unique_index(x, index)).to_list()

	def build_indexes_script(self, topic: Topic, schema: Optional[str] = None) -> List[str]:
		index_groups: Dict[str, List[Factor]] = ArrayHelper(topic.factors) \
			.filter(lambda x: is_not_blank(x.indexGroup) and x.indexGroup.startswith('i-')) \
			.group_by(lambda x: x.indexGroup)
		qualified_entity = self.qualified_table_identifier(as_table_name(topic), schema)
		async_kw = self._index_keyword()

		def build_index(factors: List[Factor], index: int) -> str:
			return \
				f'CREATE INDEX {async_kw}i_{as_table_name(topic)}_{index + 1} ON {qualified_entity} ' \
				f'({ArrayHelper(factors).map(lambda x: self.ask_column_name(x)).join(",")})'

		return ArrayHelper(list(index_groups.values())) \
			.map_with_index(lambda x, index: build_index(x, index)).to_list()
