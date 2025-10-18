from typing import Optional, List, Dict

from pydantic import BaseModel

from watchmen_ai.dspy.module.challenge_conclusion import ChallengeInsightResult
from watchmen_ai.dspy.module.evaluation_challenge_answer import EvaluationChallengeAnswerResult
from watchmen_ai.dspy.module.problem_conclusion import QuestionInsightResult
from watchmen_ai.hypothesis.model.analysis import BusinessChallengeWithProblems, AnalysisData
from watchmen_ai.hypothesis.model.metrics import MetricFlowMetric
from watchmen_auth import PrincipalService
from watchmen_utilities import ExtendedBaseModel





class ChallengeAnalysisResult(BaseModel):
    challengeTitle: str = None
    challengeInsightResult: Optional[ChallengeInsightResult] = None
    challengeMarkdown: Optional[str] = None
    hypothesisAnalysisMarkdownDict: Optional[Dict[str, str]] = {}
    # hypothesisAnalysisResult = Optional[Dict[str, AnalysisData]] = None
    questionAnswerMarkdown: Optional[str] = None
    questionResultDict: Optional[Dict[str, QuestionInsightResult]] = {}
    hypothesisResultDict  :Optional[Dict[str, AnalysisData]] = {}
    evaluation: Optional[EvaluationChallengeAnswerResult] = None



class ChallengeAgentContext:
    """
    Context for the challenge agent.
    """

    challenge_id: str
    context: str = ""  # Additional context for the agent, if needed
    all_metrics: Optional[List[MetricFlowMetric]] = []  # List of objectives related to the challenge
    principal_service: PrincipalService = None
    result_data: Optional[Dict] = None
    challenge_result: Optional[ChallengeAnalysisResult] = None
    is_auto_mode: bool = False  # Flag to indicate if the agent is in auto mode

    # Principal service for authentication and authorization

    def __init__(self, challenge_id: str, all_metrics: Optional[List[MetricFlowMetric]],
                 principal_service: PrincipalService,challenge_result:ChallengeAnalysisResult, context: str = ""):
        self.challenge_id = challenge_id
        self.context = context
        self.principal_service = principal_service
        self.all_metrics = all_metrics
        self.challenge_result = challenge_result


class QueryHistoricalExperienceResult(BaseModel):
    """
    Result of querying historical experience.
    """
    hasSimilar: bool = False
    similarChallenges: Optional[List[BusinessChallengeWithProblems]] = []


class QueryKnowledgeBaseResult(BaseModel):
    """
    Result of querying the knowledge base.
    """
    hasKnowledgeBase: bool = False
    knowledgeBaseChallenges: Optional[List[str]] = []




class SimulationResult(ExtendedBaseModel):
    """
    Result of the simulation.
    """
    simulationId: Optional[str] = None
    environmentStatus: Optional[str] = None
    challenge: BusinessChallengeWithProblems = None
    result: ChallengeAnalysisResult = None