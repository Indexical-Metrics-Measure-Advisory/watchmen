from typing import Dict, Optional, Union  # noqa

from watchmen_storage import EntityColumnName, EntitySort, EntitySortMethod


def build_sort_for_statement(sort: EntitySort) -> Optional[Dict[EntityColumnName, int]]:
	"""
	int: 1: asc; -1: desc
	"""
	if sort is None or len(sort) == 0:
		return None

	built = {}
	for elm in sort:
		if elm.method == EntitySortMethod.ASC:
			built[elm.name] = 1
		elif elm.method == EntitySortMethod.DESC:
			built[elm.name] = -1
		else:
			built[elm.name] = 1

	return built
