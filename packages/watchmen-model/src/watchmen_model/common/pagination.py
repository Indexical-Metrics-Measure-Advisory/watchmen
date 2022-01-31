from typing import Dict, List, Union

from .model import DataModel


class Pageable(DataModel):
	pageNumber: int = None
	pageSize: int = None


PageDataCell = Union[int, float, bool, str, None]
"""
data row with name
"""
PageDataRow = Union[Dict[str, PageDataCell], DataModel]
PageDataSet = Union[List[Dict[str, PageDataCell]], List[DataModel]]


class DataPage(Pageable):
	data: PageDataSet = []
	itemCount: int = None
	pageCount: int = None
