from typing import List, Union

from pydantic import BaseModel


class Pageable(BaseModel):
	pageNumber: int = None
	pageSize: int = None


"""
data row with name
"""
PageDataRow = Union[dict, BaseModel]
PageDataSet = List[PageDataRow]


class DataPage(Pageable):
	data: PageDataSet = []
	itemCount: int = None
	pageCount: int = None
