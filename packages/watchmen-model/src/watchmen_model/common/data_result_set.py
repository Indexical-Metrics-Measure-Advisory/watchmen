from datetime import date, datetime, time
from typing import List, Union

from pydantic import BaseModel

DataResultSetCell = Union[str, int, float, bool, datetime, date, time, None]
DataResultSetRow = List[DataResultSetCell]
DataResultSet = List[DataResultSetRow]


class DataResult(BaseModel):
	columns: List[str]
	data: DataResultSet
