from typing import List

from pydantic import BaseModel

from watchmen_model.common import TenantBasedTuple, OptimisticLock


class Hypothesis(BaseModel):
    hypothesis: str
    description: str
    evidence: str
    result: str


class SubQuestion(BaseModel):
    question: str
    hypothesis: List[Hypothesis] = []


class DataStory(TenantBasedTuple, OptimisticLock, BaseModel):
    businessQuestion: str
    subQuestions: List[SubQuestion] = []
