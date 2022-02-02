from typing import Any, Dict, List, Union

from pydantic import BaseModel

from .model import DataModel


class Pageable(DataModel, BaseModel):
	pageNumber: int = None
	pageSize: int = None


PageDataCell = Any
"""
data row with name
"""
PageDataRow = Union[Dict[str, PageDataCell], DataModel]
PageDataSet = Union[List[Dict[str, PageDataCell]], List[DataModel]]


class DataPage(Pageable):
	"""
	PageDataSet
	"""
	data: list = []
	itemCount: int = None
	pageCount: int = None
