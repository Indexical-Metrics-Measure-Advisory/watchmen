from typing import Any, Dict, List, Union, Optional

from watchmen_utilities import ExtendedBaseModel

from .model import DataModel


class Pageable(ExtendedBaseModel):
	pageNumber: Optional[int] = None
	pageSize: Optional[int] = None


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
	data: Optional[list] = []
	itemCount: Optional[int] = None
	pageCount: Optional[int] = None
