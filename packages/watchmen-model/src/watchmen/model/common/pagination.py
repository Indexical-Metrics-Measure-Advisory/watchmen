from pydantic import BaseModel

from watchmen.model.common.data_result_set import DataResultSet


class Pageable(BaseModel):
	pageNumber: int = None
	pageSize: int = None


class DataPage(Pageable):
	data: DataResultSet = []
	itemCount: int = None
	pageCount: int = None
