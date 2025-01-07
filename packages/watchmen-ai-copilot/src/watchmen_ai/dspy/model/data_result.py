from typing import List

from watchmen_utilities import ExtendedBaseModel


class HypothesisDataResult(ExtendedBaseModel):
    headers: List[str] = []
    data: List = []
