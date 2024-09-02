from datetime import date, datetime, time
from typing import List, Union

from watchmen_utilities import ExtendedBaseModel

DataResultSetCell = Union[str, int, float, bool, datetime, date, time, None]
DataResultSetRow = List[DataResultSetCell]
DataResultSet = List[DataResultSetRow]


class DataResult(ExtendedBaseModel):
	columns: List[str]
	data: DataResultSet
