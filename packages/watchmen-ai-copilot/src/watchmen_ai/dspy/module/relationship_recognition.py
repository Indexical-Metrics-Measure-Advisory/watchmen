from typing import List

import dspy
from pydantic import BaseModel


class RelationshipRecognitionRes(BaseModel):
    objective_name: str = None
    dependency: List[str] = None


class RelationshipRecognitionSign(dspy.Signature):
    """your task is based on the given metrics and dimensions and context  , suggest a visualization type and dimensions for each one"""

    input = dspy.InputField()
    context = dspy.InputField()
    response = dspy.OutputField(desc="this response will contain the visualization suggestion")


class RelationshipRecognitionModule(dspy.Module):
    def __init__(self):
        self.model = dspy.ChainOfThought(RelationshipRecognitionSign)

    def forward(self, content, context):
        return self.model(input=content, context=context)
