from typing import Any, Dict, List, Union, Optional

from pydantic import field_serializer

from watchmen_utilities import ExtendedBaseModel, ArrayHelper

from .model import DataModel, copy_x

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

	# Avoid error serializing to JSON: ValueError: Circular reference detected (id repeated)
	@field_serializer('data')
	def serialize_data(self, data: list, _info):
		return ArrayHelper(data).map(lambda row: copy_x(row)).to_list()


def serialize_row(row: Any):
	return copy_x(row)
