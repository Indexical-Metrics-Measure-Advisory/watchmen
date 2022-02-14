from logging import getLogger
from typing import List, Optional

from sqlalchemy import delete, func, insert, select, Table, text, update
from sqlalchemy.engine import Connection, Engine

from watchmen_model.common import DataPage
from watchmen_storage import Entity, EntityCriteriaExpression, EntityDeleter, EntityDistinctValuesFinder, \
	EntityFinder, EntityHelper, EntityId, EntityIdHelper, EntityList, EntityNotFoundException, EntityPager, \
	EntityUpdater, TooManyEntitiesFoundException, TransactionalStorageSPI, UnexpectedStorageException
from watchmen_utilities import ArrayHelper
from .sort_build import build_sort_for_statement
from .table_defs_mysql import find_table
from .types import SQLAlchemyStatement
from .where_build import build_criteria_for_statement

logger = getLogger(__name__)


class StorageMySQL(TransactionalStorageSPI):
	connection: Connection = None

	def __init__(self, engine: Engine):
		self.engine = engine

	def connect(self) -> None:
		if self.connection is None:
			self.connection = self.engine.connect()

	def begin(self) -> None:
		if self.connection is not None:
			raise UnexpectedStorageException('Connection exists, failed to begin another. It should be closed first.')

		self.connection = self.engine.connect()
		# self.connection.autocommit(False)
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

	def insert_one(self, one: Entity, helper: EntityHelper) -> None:
		table = find_table(helper.name)
		row = helper.shaper.serialize(one)
		# TODO InsertConflictException should be determined
		self.connection.execute(insert(table).values(row))

	def insert_all(self, data: List[Entity], helper: EntityHelper) -> None:
		# TODO batch insert?
		ArrayHelper(data).each(lambda row: self.insert_one(row, helper))

	def update_one(self, one: Entity, helper: EntityIdHelper) -> int:
		row = helper.shaper.serialize(one)
		entity_id = row[helper.idColumnName]
		del row[helper.idColumnName]
		updated_count = self.update(EntityUpdater(
			name=helper.name,
			shaper=helper.shaper,
			criteria=[
				EntityCriteriaExpression(name=helper.idColumnName, value=entity_id)
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
		table = find_table(updater.name)
		statement = update(table).values(updater.update)
		statement = build_criteria_for_statement(table, statement, updater.criteria, True)
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
		table = find_table(helper.name)
		statement = delete(table)
		statement = build_criteria_for_statement(table, statement, [
			EntityCriteriaExpression(name=helper.idColumnName, value=entity_id)
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
		table = find_table(deleter.name)
		statement = delete(table)
		statement = build_criteria_for_statement(table, statement, deleter.criteria)
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
				EntityCriteriaExpression(name=helper.idColumnName, value=entity_id)
			]
		))

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
		statement = build_criteria_for_statement(table, statement, finder.criteria)
		statement = build_sort_for_statement(statement, finder.sort)
		results = self.connection.execute(statement).mappings().all()
		return ArrayHelper(results).map(lambda x: dict(x)).map(finder.shaper.deserialize).to_list()

	def find(self, finder: EntityFinder) -> EntityList:
		table = find_table(finder.name)
		statement = select(table)
		return self.find_on_statement_by_finder(table, statement, finder)

	def find_distinct_values(self, finder: EntityDistinctValuesFinder) -> EntityList:
		table = find_table(finder.name)
		statement = select(*ArrayHelper(finder.distinctColumnNames).map(text).to_list()).select_from(table)
		return self.find_on_statement_by_finder(table, statement, finder)

	def find_all(self, helper: EntityHelper) -> EntityList:
		return self.find(EntityFinder(name=helper.name, shaper=helper.shaper))

	def page(self, pager: EntityPager) -> DataPage:
		table = find_table(pager.name)
		statement = select(func.count()).select_from(table)
		statement = build_criteria_for_statement(table, statement, pager.criteria)
		count = self.connection.execute(statement).scalar()

		if count == 0:
			return DataPage(
				data=[],
				pageNumber=1,
				pageSize=pager.pageable.pageSize,
				itemCount=0,
				pageCount=0
			)

		page_size = pager.pageable.pageSize
		page_number = pager.pageable.pageNumber
		pages = count / page_size
		max_page_number = int(pages)
		if pages > max_page_number:
			max_page_number += 1
		if page_number > max_page_number:
			page_number = max_page_number

		statement = select(table)
		statement = build_criteria_for_statement(table, statement, pager.criteria)
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
