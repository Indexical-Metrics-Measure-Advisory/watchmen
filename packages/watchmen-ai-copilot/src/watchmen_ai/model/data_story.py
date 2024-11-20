from typing import List

from pydantic import BaseModel

from watchmen_model.common import TenantBasedTuple, OptimisticLock


class Hypothesis(ExtendedBaseModel):
    hypothesis: str
    description: str
    evidence: str
    result: str


class SubQuestion(ExtendedBaseModel):
    question: str
    hypothesis: List[Hypothesis] = []


class DataStory(TenantBasedTuple, OptimisticLock, ExtendedBaseModel):
    businessQuestion: str
    subQuestions: List[SubQuestion] = []
