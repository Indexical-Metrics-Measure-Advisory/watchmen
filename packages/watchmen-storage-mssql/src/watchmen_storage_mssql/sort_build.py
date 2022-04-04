from typing import Union  # noqa

from sqlalchemy import asc, desc

from watchmen_storage import EntitySort, EntitySortColumn, EntitySortMethod, UnsupportedSortMethodException
from watchmen_utilities import ArrayHelper
from .types import SQLAlchemyStatement


def build_sort_column(column: EntitySortColumn):
	if column.method == EntitySortMethod.ASC:
		return asc(column.name)
	elif column.method == EntitySortMethod.DESC:
		return desc(column.name)
	else:
		raise UnsupportedSortMethodException(f'Unsupported sort method[{column.method}].')


def build_sort(sort: EntitySort) -> Union[None, list]:
	if sort is None or len(sort) == 0:
		return None

	return ArrayHelper(sort).map(build_sort_column).to_list()


def build_sort_for_statement(statement: SQLAlchemyStatement, sort: EntitySort) -> SQLAlchemyStatement:
	sort = build_sort(sort)
	if sort is not None:
		return statement.order_by(*sort)
	else:
		return statement
