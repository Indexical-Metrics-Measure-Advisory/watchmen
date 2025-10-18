
from typing import Optional

from pydantic import BaseModel


class ChallengeAnalysisEvaluation(BaseModel):
    """Evaluation of the challenge analysis results.
    """

    id: str
    business_challenge_id: str
    report: Optional[str]
    conclusion: Optional[str]
    goal_alignment: Optional[str]
    challenge_understanding: Optional[str]
    hypothesis_coverage: Optional[str]
    actionable_insights: Optional[str]
    verification_reliability: Optional[str]
    data_sufficiency: Optional[str]




#
# @dataclass
class QuestionAnalysisEvaluation(BaseModel):
    question_id: str
    title: str
    conclusion: Optional[str]
    hypothesis_coverage: Optional[str]
    data_sufficiency: Optional[str]




