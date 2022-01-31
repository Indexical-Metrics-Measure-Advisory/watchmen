from typing import List

from watchmen_model.common import DataModel, DataResultSet


class SubjectDataResultSet(DataModel):
	meta: List[str] = []
	data: DataResultSet = []
