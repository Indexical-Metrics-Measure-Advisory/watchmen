from typing import Union

from funct import Array
from sqlalchemy import asc, desc

from watchmen_storage import EntitySort, EntitySortColumn, EntitySortMethod, UnsupportedSortMethodException


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

	return list(Array(sort).map(build_sort_column))


def build_sort_for_statement(statement, sort: EntitySort) -> None:
	sort = build_sort(sort)
	if sort is not None:
		statement.order_by(*sort)
