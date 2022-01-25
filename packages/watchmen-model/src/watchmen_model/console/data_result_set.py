from typing import List

from pydantic import BaseModel

from watchmen_model.common import DataResultSet


class SubjectDataResultSet(BaseModel):
	meta: List[str] = []
	data: DataResultSet = []
