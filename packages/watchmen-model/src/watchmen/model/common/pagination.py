from pydantic import BaseModel

from watchmen.model.common.data_result_set import DataResultSet


class DataPage(BaseModel):
	data: DataResultSet = []
	itemCount: int = None
	pageNumber: int = None
	pageSize: int = None
	pageCount: int = None
