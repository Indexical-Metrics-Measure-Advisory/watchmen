from typing import List, Union

DataResultSetCell = Union[str, int, float, bool, None]
DataResultSetRow = List[DataResultSetCell]
DataResultSet = List[DataResultSetRow]
