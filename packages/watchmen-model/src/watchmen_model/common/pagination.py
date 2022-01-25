from typing import Dict, List, Union

from pydantic import BaseModel


class Pageable(BaseModel):
	pageNumber: int = None
	pageSize: int = None


PageDataCell = Union[int, float, bool, str, None]
"""
data row with name
"""
PageDataRow = Union[Dict[str, PageDataCell], BaseModel]
PageDataSet = Union[List[Dict[str, PageDataCell]], List[BaseModel]]


class DataPage(Pageable):
	data: PageDataSet = []
	itemCount: int = None
	pageCount: int = None
