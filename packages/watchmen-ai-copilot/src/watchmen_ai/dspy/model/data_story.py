from enum import Enum
from typing import List, Optional

from pydantic import BaseModel

from watchmen_ai.dspy.model.data_result import HypothesisDataResult
from watchmen_model.common import TenantBasedTuple, OptimisticLock
from watchmen_utilities import ExtendedBaseModel


class DataExplain(BaseModel):
    hypothesisValidation :str = None
    keyMetricChange :str = None
    summaryFinding:str = None

class InsightResult(BaseModel):
    answerForQuestion: str = None
    summaryForHypothesis: str = None
    futureAnalysis: str = None
    futureBusinessAction: str = None

class MarkdownSubject(ExtendedBaseModel):
    subject_name: str = None
    markdown_table: str = None


class VisualizationSuggestionType(str, Enum):
    Line = "Line"
    Bar = "Bar"
    Pie = "Pie"
    Scatter = "Scatter"
    Heatmap = "Heatmap"
    Boxplot = "Boxplot"
    Histogram = "Histogram"
    Stacked_Area = "Stacked Area"
    Stacked_Bar = "Stacked Bar"
    Funnel = "Funnel"


class DimensionResult(ExtendedBaseModel):
    systemDimension: str = None
    reason: str = None


class TimePeriod(str, Enum):
    DAY = "DAY"
    WEEK = "WEEK"
    MONTH = "MONTH"
    QUARTER = "QUARTER"
    YEAR = "YEAR"


class TimeResult(ExtendedBaseModel):
    reason: str = None
    systemDimension: str = None
    timePeriod: TimePeriod = None


class SystemMetric(ExtendedBaseModel):
    systemName: str = None
    dimension: DimensionResult = None
    timeDimension: DimensionResult = None


class Metric(ExtendedBaseModel):
    name: str = None
    formula: str = None
    description: str = None
    visualization: Optional[str] = None
    dimensions: Optional[List[str]] = []
    reason: str = None
    systemMetric: Optional[SystemMetric] = None


class HypothesisForDspy(ExtendedBaseModel):
    hypothesis: str = None
    description: str = None
    evidence: str = None
    analysisMethod: str = None
    result: Optional[DataExplain] = None


class Hypothesis(HypothesisForDspy):
    metrics: Optional[List[Metric]] = []
    dataResult:List[HypothesisDataResult] = None


class BusinessTarget(ExtendedBaseModel):
    name: str
    description: Optional[str] = None
    keywords: Optional[List[str]] = []
    datasets: Optional[List[MarkdownSubject]] = []


class SubQuestionForDspy(ExtendedBaseModel):
    question: str = None
    reason: Optional[str] = None
    isKey: Optional[bool] = False
    description: Optional[str] = None
    result: Optional[InsightResult] = None


class SubQuestion(SubQuestionForDspy):
    hypothesis: Optional[List[Hypothesis]] = []


class Dimension(ExtendedBaseModel):
    name: str = None
    description: str = None
    dimensionType: str = None


class DataStoryStatus(str, Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


class DataStory(ExtendedBaseModel, TenantBasedTuple, OptimisticLock):
    dataStoryId: str = None
    documentName: str = None
    businessQuestion: BusinessTarget = None
    subQuestions: Optional[List[SubQuestion]] = []
    status: DataStoryStatus = DataStoryStatus.DRAFT
    dimensions: Optional[List[Dimension]] = []
