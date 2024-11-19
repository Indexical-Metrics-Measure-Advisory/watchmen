from enum import Enum
from typing import List

import dspy
from dspy import Module
from pydantic import BaseModel


class VisualizationSuggestionType(str, Enum):
    Line = "Line"
    Bar = "Bar"
    Pie = "Pie"
    Scatter = "Scatter"
    Heatmap = "Heatmap"
    Boxplot = "Boxplot"
    Histogram = "Histogram"


class VisualizationSuggestionResult(BaseModel):
    metric_name: str = None
    suggestion: VisualizationSuggestionType = None
    suggestion_dimensions: List[str] = None
    reason: str = None


class VisualizationSuggestion(dspy.Signature):
    """your task is based on the given metrics and dimensions and context  , suggest a visualization type and dimensions for each one"""

    dimensions = dspy.InputField()
    context = dspy.InputField()
    input: str = dspy.InputField()
    response: List[VisualizationSuggestionResult] = dspy.OutputField(
        desc="this response will contain the visualization suggestion")


class VisualizationSuggestionModule(Module):
    def __init__(self):
        self.suggest = dspy.ChainOfThought(VisualizationSuggestion)

    def forward(self, content, dimensions, context):
        return self.suggest(input=content, dimensions=dimensions, context=context)
