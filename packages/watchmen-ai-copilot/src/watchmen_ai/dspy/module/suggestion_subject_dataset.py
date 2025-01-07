from typing import Optional, List

import dspy
from pydantic import BaseModel


class DatasetResult(BaseModel):
    dataset_name: str = None
    reason: str = None


class SuggestionsDatasetResult(BaseModel):
    business_question: str = None
    dataset_list: Optional[List[DatasetResult]] = None


class SuggestionsDatasetSignature(dspy.Signature):
    """your task is to suggest the dataset name  for the business question"""

    business_question = dspy.InputField(desc="business question for insurance analysis")
    dataset = dspy.InputField(desc="dataset name and factor list")
    response: SuggestionsDatasetResult = dspy.OutputField(desc="this response will contain matching subject")


class SuggestionsDatasetModule(dspy.Module):
    def __init__(self):
        self.model = dspy.ChainOfThought(SuggestionsDatasetSignature)

    def forward(self, business_question, dataset):
        return self.model(business_question=business_question, dataset=dataset)
