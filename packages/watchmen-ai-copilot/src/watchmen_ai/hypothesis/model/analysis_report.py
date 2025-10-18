from typing import Optional

from watchmen_model.common import UserBasedTuple, OptimisticLock, Auditable
from watchmen_utilities import ExtendedBaseModel


class AnalysisReportHeader(ExtendedBaseModel):
    """
    header content for check whether the analysis report is need new version    
    """
    timePeriod: str  # Time period of the analysis report (e.g., Q1 2023)
    challengeName:str 
    questionCount:int
    hypothesisCount:int
    metricCount:int




class AnalysisReport(ExtendedBaseModel, UserBasedTuple, OptimisticLock, Auditable):
    """
    Represents an analysis report for a business challenge.
    This class extends UserBasedTuple, OptimisticLock, and Auditable to include user information,
    optimistic locking, and auditing capabilities.
    """

    analysisReportId: str
    header:Optional[AnalysisReportHeader] = None
    content: str  # Markdown content of the analysis report
    challenge_id: str  # ID of the associated business challenge
    status: str  # Status of the analysis report (e.g., draft, published)

