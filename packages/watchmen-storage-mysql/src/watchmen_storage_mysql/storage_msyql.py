from datetime import date, time
from decimal import Decimal
from logging import getLogger
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

from sqlalchemy import and_, delete, func, insert, select, Table, text, update
from sqlalchemy.engine import Connection, Engine
from sqlalchemy.sql import Join, label
from sqlalchemy.sql.elements import Label, literal_column

from watchmen_model.admin import Factor, FactorType, is_aggregation_topic, is_raw_topic, Topic
from watchmen_model.common import DataPage, TopicId
from watchmen_storage import as_table_name, ColumnNameLiteral, Entity, EntityColumnAggregateArithmetic, \
	EntityCriteriaExpression, EntityDeleter, EntityDistinctValuesFinder, EntityFinder, EntityHelper, EntityId, \
	EntityIdHelper, EntityList, EntityNotFoundException, EntityPager, EntityStraightAggregateColumn, \
	EntityStraightColumn, EntityStraightValuesFinder, EntityUpdater, FreeColumn, FreeJoin, FreeJoinType, FreePager, \
	NoFreeJoinException, TooManyEntitiesFoundException, TopicDataStorageSPI, TransactionalStorageSPI, \
	UnexpectedStorageException, UnsupportedStraightColumnException
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank
from .sort_build import build_sort_for_statement
from .table_defs_mysql import find_table, register_table
from .types import SQLAlchemyStatement
from .where_build import build_criteria_for_statement, build_literal

logger = getLogger(__name__)


class StorageMySQL(TransactionalStorageSPI):
	"""
	name in update, criteria, sort must be serialized to column name, otherwise behavior cannot be predicated
	"""
	connection: Connection = None

	def __init__(self, engine: Engine):
		self.engine = engine

	def connect(self) -> None:
		if self.connection is None:
			self.connection = self.engine.connect().execution_options(isolation_level="AUTOCOMMIT")

	def begin(self) -> None:
		if self.connection is not None:
			raise UnexpectedStorageException('Connection exists, failed to begin another. It should be closed first.')

		self.connection = self.engine.connect()
		self.connection.begin()

	def commit_and_close(self) -> None:
		try:
			self.connection.commit()
		except Exception as e:
			raise e
		else:
			self.close()

	def rollback_and_close(self) -> None:
		try:
			self.connection.rollback()
		except Exception as e:
			logger.warning('Exception raised on rollback.', e, exc_info=True, stack_info=True)
		finally:
			self.close()

	def close(self) -> None:
		try:
			if self.connection is not None:
				self.connection.close()
				del self.connection
		except Exception as e:
			logger.warning('Exception raised on close connection.', e)

	# noinspection PyMethodMayBeStatic
	def find_table(self, name: str) -> Table:
		return find_table(name)

	def insert_one(self, one: Entity, helper: EntityHelper) -> None:
		table = self.find_table(helper.name)
		row = helper.shaper.serialize(one)
		self.connection.execute(insert(table).values(row))

	def insert_all(self, data: List[Entity], helper: EntityHelper) -> None:
		ArrayHelper(data).each(lambda row: self.insert_one(row, helper))

	def update_one(self, one: Entity, helper: EntityIdHelper) -> int:
		row = helper.shaper.serialize(one)
		entity_id = row[helper.idColumnName]
		del row[helper.idColumnName]
		updated_count = self.update(EntityUpdater(
			name=helper.name,
			shaper=helper.shaper,
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName=helper.idColumnName), right=entity_id)
			],
			update=row
		))
		return updated_count

	def update_only(self, updater: EntityUpdater) -> int:
		updated_count = self.update(updater)
		if updated_count == 0:
			raise EntityNotFoundException(f'Entity not found by updater[{updater}]')
		elif updated_count == 1:
			return 1
		else:
			raise TooManyEntitiesFoundException(f'Too many entities found by updater[{updater}].')

	def update_only_and_pull(self, updater: EntityUpdater) -> Optional[Entity]:
		entity = self.find_one(EntityFinder(
			name=updater.name,
			shaper=updater.shaper,
			criteria=updater.criteria
		))
		if entity is None:
			raise EntityNotFoundException(f'Entity not found by updater[{updater}]')
		else:
			self.update_only(updater)
			return entity

	def update(self, updater: EntityUpdater) -> int:
		table = self.find_table(updater.name)
		statement = update(table).values(updater.update)
		statement = build_criteria_for_statement([table], statement, updater.criteria, True)
		result = self.connection.execute(statement)
		return result.rowcount

	def update_and_pull(self, updater: EntityUpdater) -> EntityList:
		entity_list = self.find(EntityFinder(
			name=updater.name,
			shaper=updater.shaper,
			criteria=updater.criteria
		))
		found_count = len(entity_list)
		if found_count == 0:
			# not found, no need to update
			return []
		else:
			updated_count = self.update(updater)
			if updated_count != found_count:
				logger.warning(f'Update count[{updated_count}] does not match pull count[{found_count}].')
			return entity_list

	def delete_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> int:
		table = self.find_table(helper.name)
		statement = delete(table)
		statement = build_criteria_for_statement([table], statement, [
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName=helper.idColumnName), right=entity_id)
		])
		result = self.connection.execute(statement)
		return result.rowcount

	def delete_by_id_and_pull(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		entity = self.find_by_id(entity_id, helper)
		if entity is None:
			# not found, no need to delete
			return None
		else:
			self.delete_by_id(entity_id, helper)
			return entity

	def delete_only(self, deleter: EntityDeleter) -> int:
		deleted_count = self.delete(deleter)
		if deleted_count == 0:
			raise EntityNotFoundException(f'Entity not found by deleter[{deleter}].')
		elif deleted_count == 1:
			return 1
		else:
			raise TooManyEntitiesFoundException(f'Too many entities found by deleter[{deleter}].')

	def delete_only_and_pull(self, deleter: EntityDeleter) -> Optional[Entity]:
		entity = self.find_one(EntityFinder(
			name=deleter.name,
			shaper=deleter.shaper,
			criteria=deleter.criteria
		))
		if entity is None:
			raise EntityNotFoundException(f'Entity not found by deleter[{deleter}].')
		else:
			self.delete_only(deleter)
			return entity

	def delete(self, deleter: EntityDeleter) -> int:
		table = self.find_table(deleter.name)
		statement = delete(table)
		statement = build_criteria_for_statement([table], statement, deleter.criteria, True)
		result = self.connection.execute(statement)
		return result.rowcount

	def delete_and_pull(self, deleter: EntityDeleter) -> EntityList:
		entity_list = self.find(EntityFinder(
			name=deleter.name,
			shaper=deleter.shaper,
			criteria=deleter.criteria
		))
		found_count = len(entity_list)
		if found_count == 0:
			return []
		else:
			deleted_count = self.delete(deleter)
			if deleted_count != found_count:
				logger.warning(f'Delete count[{deleted_count}] does not match pull count[{found_count}].')
			return entity_list

	def find_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		return self.find_one(EntityFinder(
			name=helper.name,
			shaper=helper.shaper,
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName=helper.idColumnName), right=entity_id)
			]
		))

	def find_and_lock_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		table = self.find_table(helper.name)
		statement = select(table).with_for_update()
		statement = build_criteria_for_statement([table], statement, [
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName=helper.idColumnName), right=entity_id)
		])
		data = self.connection.execute(statement).mappings().all()
		if len(data) == 0:
			return None
		elif len(data) == 1:
			return data[0]
		else:
			raise TooManyEntitiesFoundException(f'Too many entities found by finder[{helper}].')

	def find_one(self, finder: EntityFinder) -> Optional[Entity]:
		data = self.find(finder)
		if len(data) == 0:
			return None
		elif len(data) == 1:
			return data[0]
		else:
			raise TooManyEntitiesFoundException(f'Too many entities found by finder[{finder}].')

	def find_on_statement_by_finder(
			self, table: Table, statement: SQLAlchemyStatement, finder: EntityFinder
	) -> EntityList:
		statement = build_criteria_for_statement([table], statement, finder.criteria)
		statement = build_sort_for_statement(statement, finder.sort)
		results = self.connection.execute(statement).mappings().all()
		return ArrayHelper(results).map(lambda x: dict(x)).map(finder.shaper.deserialize).to_list()

	def find(self, finder: EntityFinder) -> EntityList:
		table = self.find_table(finder.name)
		statement = select(table)
		return self.find_on_statement_by_finder(table, statement, finder)

	def find_distinct_values(self, finder: EntityDistinctValuesFinder) -> EntityList:
		table = self.find_table(finder.name)
		statement = select(*ArrayHelper(finder.distinctColumnNames).map(text).to_list()).select_from(table)
		return self.find_on_statement_by_finder(table, statement, finder)

	# noinspection PyMethodMayBeStatic
	def get_alias_from_straight_column(self, straight_column: EntityStraightColumn) -> Any:
		return straight_column.columnName if is_blank(straight_column.alias) else straight_column.alias

	# noinspection PyMethodMayBeStatic
	def translate_straight_column_name(self, straight_column: EntityStraightColumn) -> Any:
		if isinstance(straight_column, EntityStraightAggregateColumn):
			if straight_column.arithmetic == EntityColumnAggregateArithmetic.SUM:
				return func.sum(straight_column.columnName).label(self.get_alias_from_straight_column(straight_column))
			elif straight_column.arithmetic == EntityColumnAggregateArithmetic.AVG:
				return func.avg(straight_column.columnName).label(self.get_alias_from_straight_column(straight_column))
			elif straight_column.arithmetic == EntityColumnAggregateArithmetic.MAX:
				return func.max(straight_column.columnName).label(self.get_alias_from_straight_column(straight_column))
			elif straight_column.arithmetic == EntityColumnAggregateArithmetic.MIN:
				return func.min(straight_column.columnName).label(self.get_alias_from_straight_column(straight_column))
		elif isinstance(straight_column, EntityStraightColumn):
			return literal_column(straight_column.columnName) \
				.label(self.get_alias_from_straight_column(straight_column))

		raise UnsupportedStraightColumnException(f'Straight column[{straight_column.to_dict()}] is not supported.')

	def translate_straight_group_bys(
			self, statement: SQLAlchemyStatement, straight_columns: List[EntityStraightColumn]) -> SQLAlchemyStatement:
		group_columns = ArrayHelper(straight_columns) \
			.filter(lambda x: isinstance(x, EntityStraightAggregateColumn)).to_list()
		if len(group_columns) == 0:
			# no grouped columns
			return statement
		# find columns rather than grouped
		non_group_columns = ArrayHelper(straight_columns) \
			.filter(lambda x: not isinstance(x, EntityStraightAggregateColumn)).to_list()
		if len(non_group_columns) == 0:
			# all columns are grouped
			return statement

		# use alias name to build group by statement
		return statement.group_by(
			*ArrayHelper(non_group_columns).map(lambda x: self.get_alias_from_straight_column(x)).to_list())

	def find_straight_values(self, finder: EntityStraightValuesFinder) -> EntityList:
		table = self.find_table(finder.name)
		statement = select(
			*ArrayHelper(finder.straightColumns).map(self.translate_straight_column_name).to_list()) \
			.select_from(table)
		statement = build_criteria_for_statement([table], statement, finder.criteria)
		statement = self.translate_straight_group_bys(statement, finder.straightColumns)
		statement = build_sort_for_statement(statement, finder.sort)
		results = self.connection.execute(statement).mappings().all()
		return ArrayHelper(results).map(lambda x: dict(x)).to_list()

	def find_all(self, helper: EntityHelper) -> EntityList:
		return self.find(EntityFinder(name=helper.name, shaper=helper.shaper))

	def execute_page_count(self, statement: SQLAlchemyStatement, page_size: int) -> Tuple[int, Optional[DataPage]]:
		count = self.connection.execute(statement).scalar()

		if count == 0:
			return 0, DataPage(
				data=[],
				pageNumber=1,
				pageSize=page_size,
				itemCount=0,
				pageCount=0
			)
		else:
			return count, None

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

	def page(self, pager: EntityPager) -> DataPage:
		page_size = pager.pageable.pageSize

		table = self.find_table(pager.name)
		statement = select(func.count()).select_from(table)
		statement = build_criteria_for_statement([table], statement, pager.criteria)
		count, empty_page = self.execute_page_count(statement, page_size)
		if count == 0:
			return empty_page

		page_number, max_page_number = self.compute_page(count, page_size, pager.pageable.pageNumber)

		statement = select(table)
		statement = build_criteria_for_statement([table], statement, pager.criteria)
		statement = build_sort_for_statement(statement, pager.sort)
		offset = page_size * (page_number - 1)
		statement = statement.offset(offset).limit(page_size)
		results = self.connection.execute(statement).mappings().all()
		entity_list = ArrayHelper(results).map(lambda x: dict(x)).map(pager.shaper.deserialize).to_list()
		return DataPage(
			data=entity_list,
			pageNumber=page_number,
			pageSize=page_size,
			itemCount=count,
			pageCount=max_page_number
		)

	def exists(self, finder: EntityFinder) -> bool:
		table = self.find_table(finder.name)
		statement = select(text('1')).select_from(table)
		statement = build_criteria_for_statement([table], statement, finder.criteria)
		statement = statement.offset(0).limit(1)
		results = self.connection.execute(statement).mappings().all()
		return len(results) != 0

	def count(self, finder: EntityFinder) -> int:
		table = self.find_table(finder.name)
		statement = select(func.count()).select_from(table)
		statement = build_criteria_for_statement([table], statement, finder.criteria)
		count, _ = self.execute_page_count(statement, 1)
		return count


def ask_column_name(factor: Factor) -> str:
	return factor.name.strip().lower().replace('.', '_').replace('-', '_').replace(' ', '_')


def varchar_column(precision: str) -> str:
	return f'VARCHAR({precision})'


def varchar_10(precision: Optional[str] = '10') -> str:
	return varchar_column('10' if is_blank(precision) else precision)


def varchar_20(precision: Optional[str] = '20') -> str:
	return varchar_column('20' if is_blank(precision) else precision)


def varchar_50(precision: Optional[str] = '50') -> str:
	return varchar_column('50' if is_blank(precision) else precision)


def varchar_100(precision: Optional[str] = '100') -> str:
	return varchar_column('100' if is_blank(precision) else precision)


def varchar_255(precision: Optional[str] = '255') -> str:
	return varchar_column('255' if is_blank(precision) else precision)


def decimal_column(precision: str) -> str:
	return f'DECIMAL({precision})'


def decimal_10_2(precision: Optional[str] = '10,2') -> str:
	return decimal_column('10,2' if is_blank(precision) else precision)


def decimal_32_6(precision: Optional[str] = '32,6') -> str:
	return decimal_column('32,6' if is_blank(precision) else precision)


FactorTypeMap: Dict[FactorType, Union[str, Callable[[Optional[str]], str]]] = {
	FactorType.SEQUENCE: 'BIGINT',

	FactorType.NUMBER: decimal_32_6,
	FactorType.UNSIGNED: decimal_32_6,

	FactorType.TEXT: varchar_255,

	# address
	FactorType.ADDRESS: 'TEXT',
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

	# contact electronic
	FactorType.EMAIL: varchar_100,
	FactorType.PHONE: varchar_50,
	FactorType.MOBILE: varchar_50,
	FactorType.FAX: varchar_50,

	# date time related
	FactorType.DATETIME: 'DATETIME',
	FactorType.FULL_DATETIME: 'DATETIME',
	FactorType.DATE: 'DATE',
	FactorType.TIME: 'TIME',
	FactorType.YEAR: 'SMALLINT',
	FactorType.HALF_YEAR: 'TINYINT',
	FactorType.QUARTER: 'TINYINT',
	FactorType.MONTH: 'TINYINT',
	FactorType.HALF_MONTH: 'TINYINT',
	FactorType.TEN_DAYS: 'TINYINT',
	FactorType.WEEK_OF_YEAR: 'TINYINT',
	FactorType.WEEK_OF_MONTH: 'TINYINT',
	FactorType.HALF_WEEK: 'TINYINT',
	FactorType.DAY_OF_MONTH: 'TINYINT',
	FactorType.DAY_OF_WEEK: 'TINYINT',
	FactorType.DAY_KIND: 'TINYINT',
	FactorType.HOUR: 'TINYINT',
	FactorType.HOUR_KIND: 'TINYINT',
	FactorType.MINUTE: 'TINYINT',
	FactorType.SECOND: 'TINYINT',
	FactorType.MILLISECOND: 'TINYINT',
	FactorType.AM_PM: 'TINYINT',

	# individual
	FactorType.GENDER: varchar_10,
	FactorType.OCCUPATION: varchar_10,
	FactorType.DATE_OF_BIRTH: 'DATE',
	FactorType.AGE: 'SMALLINT',
	FactorType.ID_NO: varchar_50,
	FactorType.RELIGION: varchar_10,
	FactorType.NATIONALITY: varchar_10,

	# organization
	FactorType.BIZ_TRADE: varchar_10,
	FactorType.BIZ_SCALE: 'INT',

	FactorType.BOOLEAN: 'TINYINT',

	FactorType.ENUM: varchar_20,

	FactorType.OBJECT: 'JSON',
	FactorType.ARRAY: 'JSON'
}


def ask_column_type(factor: Factor) -> str:
	column_type = FactorTypeMap.get(factor.type)
	if isinstance(column_type, str):
		return column_type
	elif is_blank(factor.precision):
		return column_type()
	else:
		return column_type(factor.precision.strip())


def build_columns(topic: Topic) -> str:
	if is_raw_topic(topic):
		flatten_factors = ArrayHelper(topic.factors) \
			.filter(lambda x: x.flatten) \
			.map(lambda x: f'\t{ask_column_name(x)} {ask_column_type(x)},') \
			.to_list()
		if len(flatten_factors) == 0:
			return '\tdata_ JSON,'
		else:
			return '\n'.join(flatten_factors) + '\n\tdata_ JSON,'
	else:
		return ArrayHelper(topic.factors) \
			.filter(lambda x: '.' not in x.name) \
			.map(lambda x: f'\t{ask_column_name(x)} {ask_column_type(x)},') \
			.join('\n')


def build_aggregate_assist_column(topic: Topic) -> str:
	return f'\taggregate_assist_ JSON,' if is_aggregation_topic(topic) else ''


def build_version_column(topic: Topic) -> str:
	return f'\tversion_ INT,' if is_aggregation_topic(topic) else ''


def build_unique_indexes(topic: Topic) -> str:
	index_groups: Dict[str, List[Factor]] = ArrayHelper(topic.factors) \
		.filter(lambda x: is_not_blank(x.indexGroup) and x.indexGroup.startswith('u-')) \
		.group_by(lambda x: x.indexGroup)
	if len(index_groups) == 0:
		return ''
	else:
		def build_unique_index(factors: List[Factor]) -> str:
			return f'\tUNIQUE INDEX ({ArrayHelper(factors).map(lambda x: ask_column_name(x)).join(",")}),'

		return ArrayHelper(list(index_groups.values())).map(lambda x: build_unique_index(x)).join('\n')


def build_indexes(topic: Topic) -> str:
	index_groups: Dict[str, List[Factor]] = ArrayHelper(topic.factors) \
		.filter(lambda x: is_not_blank(x.indexGroup) and x.indexGroup.startswith('i-')) \
		.group_by(lambda x: x.indexGroup)
	if len(index_groups) == 0:
		return ''
	else:
		def build_index(factors: List[Factor]) -> str:
			return f'\tINDEX ({ArrayHelper(factors).map(lambda x: ask_column_name(x)).join(",")}),'

		return ArrayHelper(list(index_groups.values())).map(lambda x: build_index(x)).join('\n')


# noinspection SqlResolve
def build_columns_script(topic: Topic, original_topic: Topic) -> List[str]:
	entity_name = as_table_name(topic)
	original_factors: Dict[str, Factor] = ArrayHelper(original_topic.factors) \
		.to_map(lambda x: x.name.strip().lower(), lambda x: x)

	# noinspection SqlResolve
	def build_column_script(factor: Tuple[Factor, bool]) -> str:
		if factor[1]:
			# do alter column
			return f'ALTER TABLE {entity_name} MODIFY COLUMN {ask_column_name(factor[0])} {ask_column_type(factor[0])}'
		else:
			return f'ALTER TABLE {entity_name} ADD COLUMN {ask_column_name(factor[0])} {ask_column_type(factor[0])}'

	if is_raw_topic(topic):
		factors = ArrayHelper(topic.factors) \
			.filter(lambda x: x.flatten) \
			.map(lambda x: f'\t{ask_column_name(x)} {ask_column_type(x)},') \
			.to_list()
	else:
		factors = topic.factors

	columns = ArrayHelper(factors) \
		.map(lambda x: (x, x.name.strip().lower() in original_factors)) \
		.map(build_column_script) \
		.to_list()

	if is_raw_topic(topic) and not is_raw_topic(original_topic):
		columns.append(f'ALTER TABLE {entity_name} ADD COLUMN data_ JSON')

	if is_aggregation_topic(topic) and not is_aggregation_topic(original_topic):
		columns.append(f'ALTER TABLE {entity_name} ADD COLUMN aggregate_assist_ JSON')
		columns.append(f'ALTER TABLE {entity_name} ADD COLUMN version_ INT')

	return columns


def build_unique_indexes_script(topic: Topic) -> List[str]:
	index_groups: Dict[str, List[Factor]] = ArrayHelper(topic.factors) \
		.filter(lambda x: is_not_blank(x.indexGroup) and x.indexGroup.startswith('u-')) \
		.group_by(lambda x: x.indexGroup)

	# noinspection SqlResolve
	def build_unique_index(factors: List[Factor]) -> str:
		return \
			f'ALTER TABLE {as_table_name(topic)} ADD UNIQUE INDEX ' \
			f'({ArrayHelper(factors).map(lambda x: ask_column_name(x)).join(",")})'

	return ArrayHelper(list(index_groups.values())).map(lambda x: build_unique_index(x)).to_list()


def build_indexes_script(topic: Topic) -> List[str]:
	index_groups: Dict[str, List[Factor]] = ArrayHelper(topic.factors) \
		.filter(lambda x: is_not_blank(x.indexGroup) and x.indexGroup.startswith('i-')) \
		.group_by(lambda x: x.indexGroup)

	# noinspection SqlResolve
	def build_index(factors: List[Factor]) -> str:
		return \
			f'ALTER TABLE {as_table_name(topic)} ADD INDEX ' \
			f'({ArrayHelper(factors).map(lambda x: ask_column_name(x)).join(",")})'

	return ArrayHelper(list(index_groups.values())).map(lambda x: build_index(x)).to_list()


class TopicDataStorageMySQL(StorageMySQL, TopicDataStorageSPI):
	def register_topic(self, topic: Topic) -> None:
		register_table(topic)

	# noinspection SqlResolve
	def create_topic_entity(self, topic: Topic) -> None:
		try:
			self.connect()
			entity_name = as_table_name(topic)
			# noinspection SqlType
			script = f'''
CREATE TABLE {entity_name} (
\tid_ BIGINT,
{build_columns(topic)}
{build_aggregate_assist_column(topic)}
{build_version_column(topic)}
\ttenant_id_ VARCHAR(50),
\tinsert_time_ DATETIME,
\tupdate_time_ DATETIME,
{build_unique_indexes(topic)}
{build_indexes(topic)}
\tINDEX (tenant_id_),
\tINDEX (insert_time_),
\tINDEX (update_time_),
\tPRIMARY KEY (id_)
			)'''
			self.connection.execute(text(script))
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
		finally:
			self.close()

	def update_topic_entity(self, topic: Topic, original_topic: Topic) -> None:
		"""
		1. drop no column,\n
		2. factor indexes from original topic are dropped,\n
		3. factor indexes from topic are created,\n
		4. compatible column type changes are applied,\n
		5. any exception is ignored.
		"""
		try:
			self.connect()
			entity_name = as_table_name(topic)
			self.connection.execute(text(f"CALL DROP_INDEXES_ON_TOPIC_CHANGED('{entity_name}')"))
			# try to change column anyway, ignore when failed
			for column_script in build_columns_script(topic, original_topic):
				try:
					self.connection.execute(text(column_script))
				except Exception as e:
					logger.error(e, exc_info=True, stack_info=True)
			# try to add index
			for unique_index_script in build_unique_indexes_script(topic):
				try:
					self.connection.execute(text(unique_index_script))
				except Exception as e:
					logger.error(e, exc_info=True, stack_info=True)
			for index_script in build_indexes_script(topic):
				try:
					self.connection.execute(text(index_script))
				except Exception as e:
					logger.error(e, exc_info=True, stack_info=True)
			try:
				# noinspection SqlResolve
				self.connection.execute(text(f'ALTER TABLE {as_table_name(topic)} ADD INDEX (tenant_id_)'))
			except Exception as e:
				logger.error(e, exc_info=True, stack_info=True)
			try:
				# noinspection SqlResolve
				self.connection.execute(text(f'ALTER TABLE {as_table_name(topic)} ADD INDEX (insert_time_)'))
			except Exception as e:
				logger.error(e, exc_info=True, stack_info=True)
			try:
				# noinspection SqlResolve
				self.connection.execute(text(f'ALTER TABLE {as_table_name(topic)} ADD INDEX (update_time_)'))
			except Exception as e:
				logger.error(e, exc_info=True, stack_info=True)
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
		finally:
			self.close()

	def drop_topic_entity(self, topic_name: str) -> None:
		entity_name = as_table_name(topic_name)
		try:
			self.connect()
			# noinspection SqlResolve
			self.connection.execute(text(f'DROP TABLE {entity_name}'))
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
		finally:
			self.close()

	def truncate(self, helper: EntityHelper) -> None:
		table = self.find_table(helper.name)
		# noinspection SqlResolve
		self.connection.execute(text(f'TRUNCATE TABLE {table.name}'))

	# noinspection PyMethodMayBeStatic
	def build_single_on(self, join: FreeJoin, primary_table: Table, secondary_table: Table) -> Any:
		primary_column = primary_table.c[join.primary.columnName]
		secondary_column = secondary_table.c[join.primary.columnName]
		return primary_column == secondary_column

	def try_to_join(self, groups: Dict[TopicId, List[FreeJoin]], tables: List[Table], built=None) -> Join:
		pending_groups: Dict[TopicId, List[FreeJoin]] = {}
		for primary_entity_name, joins_by_primary in groups.items():
			primary_table = self.find_table(primary_entity_name)
			if built is not None and primary_table not in tables:
				# primary table not used, pending to next round
				pending_groups[primary_entity_name] = joins_by_primary
			else:
				groups_by_secondary: Dict[TopicId, List[FreeJoin]] = ArrayHelper(joins_by_primary) \
					.group_by(lambda x: x.secondary.entityName)
				for secondary_entity_name, joins_by_secondary in groups_by_secondary:
					# every join is left join, otherwise reduce to inner join
					outer_join = ArrayHelper(joins_by_secondary).every(lambda x: x.type == FreeJoinType.LEFT)
					secondary_table = self.find_table(secondary_entity_name)
					on = and_(
						*ArrayHelper(joins_by_secondary).map(
							lambda x: self.build_single_on(x, primary_table, secondary_table)).to_list())
					if built is None:
						built = primary_table.join(secondary_table, on, outer_join)
					else:
						built = built.join(secondary_table, on, outer_join)
					# append into used
					if secondary_table not in tables:
						tables.append(secondary_table)
				# append into used
				if primary_table not in tables:
					tables.append(primary_table)

		if len(pending_groups) == 0:
			# all groups consumed
			return built
		if len(pending_groups) == len(groups):
			# no groups can be consumed on this round
			raise UnexpectedStorageException('Cannot join tables by given declaration.')
		# at least one group consumed, do next round
		return self.try_to_join(pending_groups, tables, built)

	def build_free_joins_on_multiple(self, table_joins: Optional[List[FreeJoin]]) -> Tuple[Join, List[Table]]:
		def try_to_be_left_join(free_join: FreeJoin) -> FreeJoin:
			if free_join.type == FreeJoinType.RIGHT:
				return FreeJoin(primary=free_join.secondary, secondary=free_join.primary, type=FreeJoinType.LEFT)
			else:
				return free_join

		tables: List[Table] = []
		groups_by_primary: Dict[TopicId, List[FreeJoin]] = ArrayHelper(table_joins) \
			.map(try_to_be_left_join) \
			.group_by(lambda x: x.primary.entityName)
		return self.try_to_join(groups_by_primary, tables), tables

	def build_free_joins(self, table_joins: Optional[List[FreeJoin]]) -> Tuple[Join, List[Table]]:
		if table_joins is None or len(table_joins) == 0:
			raise NoFreeJoinException('No join found.')
		if len(table_joins) == 1:
			# single topic
			entity_name = table_joins[0].primary.entityName
			table = self.find_table(entity_name)
			return table, [table]
		else:
			return self.build_free_joins_on_multiple(table_joins)

	# noinspection PyMethodMayBeStatic
	def build_free_column(self, table_column: FreeColumn, index: int, tables: List[Table]) -> Label:
		built = build_literal(tables, table_column.literal)
		if isinstance(built, (str, int, float, Decimal, bool, date, time)):
			# value won't change after build to literal
			return label(f'column_{index + 1}', built)
		else:
			return built.label(f'column_{index + 1}')

	# noinspection PyMethodMayBeStatic
	def build_free_columns(self, table_columns: Optional[List[FreeColumn]], tables: List[Table]) -> List[Label]:
		return ArrayHelper(table_columns) \
			.map_with_index(lambda x, index: self.build_free_column(x, index, tables)) \
			.to_list()

	def free_page(self, pager: FreePager) -> DataPage:
		page_size = pager.pageable.pageSize
		select_from, tables = self.build_free_joins(pager.joins)

		statement = select(func.count()).select_from(select_from)
		statement = build_criteria_for_statement(tables, statement, pager.criteria)
		count, empty_page = self.execute_page_count(statement, page_size)
		if count == 0:
			return empty_page

		page_number, max_page_number = self.compute_page(count, page_size, pager.pageable.pageNumber)

		statement = select(self.build_free_columns(pager.columns, tables)).select_from(select_from)
		statement = build_criteria_for_statement(tables, statement, pager.criteria)
		offset = page_size * (page_number - 1)
		statement = statement.offset(offset).limit(page_size)
		results = self.connection.execute(statement).mappings().all()

		def deserialize(row: Dict[str, Any]) -> Dict[str, Any]:
			data: Dict[str, Any] = {}
			for index, column in enumerate(pager.columns):
				data[column.alias] = row.get(f'column_{index + 1}')
			return data

		results = ArrayHelper(results).map(deserialize).to_list()
		return DataPage(
			data=results,
			pageNumber=page_number,
			pageSize=page_size,
			itemCount=count,
			pageCount=max_page_number
		)
