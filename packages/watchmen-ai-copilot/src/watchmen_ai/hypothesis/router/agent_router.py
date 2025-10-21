from logging import getLogger
from typing import List, Optional

import dspy
from fastapi import APIRouter, Depends

from watchmen_ai.dspy.module.challenge_conclusion import ChallengeInsightResult
from watchmen_ai.dspy.module.challenge_verification import ChallengeVerification, VerificationResult
from watchmen_ai.dspy.module.evaluation_challenge_answer import EvaluationChallengeAnswerModule
from watchmen_ai.hypothesis.env.challenge_simulate_env import ChallengeSimulateEnv
from watchmen_ai.hypothesis.meta.analysis_meta_service import AnalysisService
from watchmen_ai.hypothesis.meta.metric_meta_service import MetricService
from watchmen_ai.hypothesis.model.analysis import BusinessChallengeWithProblems, AnalysisData
from watchmen_ai.hypothesis.model.business import BusinessChallenge
from watchmen_ai.hypothesis.model.common import ChallengeAgentContext, QueryHistoricalExperienceResult, \
    QueryKnowledgeBaseResult, ChallengeAnalysisResult, SimulationResult
from watchmen_ai.hypothesis.model.metrics import MetricFlowMetric
from watchmen_ai.hypothesis.rag.rag_hub import vector_repository
from watchmen_ai.hypothesis.report.markdown_report import build_analysis_report_md
from watchmen_ai.hypothesis.service.challenge_service import load_full_challenge
from watchmen_ai.hypothesis.service.metric_service import load_all_metrics_from_mf
from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.meta import ObjectiveService
from watchmen_indicator_surface.util import trans
from watchmen_meta.common import ask_snowflake_generator, ask_meta_storage
from watchmen_rest import get_any_principal
router = APIRouter()

logger = getLogger(__name__)


def get_objective_service(principal_service: PrincipalService) -> ObjectiveService:
    return ObjectiveService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_metric_service(principal_service: PrincipalService) -> MetricService:
    return MetricService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_analysis_service(principal_service: PrincipalService) -> AnalysisService:
    return AnalysisService(ask_meta_storage(), ask_snowflake_generator(), principal_service)




## Evaluate Insurance Business Challenge
@router.post("/challenge/agent/evaluate", tags=["hypothesis"])
async def evaluate_insurance_business_challenge(
        challenge: BusinessChallenge,
        principal_service: PrincipalService = Depends(get_any_principal)) -> VerificationResult:
    """
    Evaluate the insurance business challenge.
    :param challenge: The business challenge to evaluate.
    :param principal_service: The principal service for authentication and authorization.
    :return: The evaluated business challenge with problems.
    """
    title = challenge.title

    challenge_verification = ChallengeVerification()

    result: VerificationResult = challenge_verification(business_challenge=title,
                                                        business_challenge_description=challenge.description).response

    dspy.inspect_history(1)
    # Load the full challenge with problems
    return result


## Query Historical Experience
@router.post("/challenge/agent/query", tags=["hypothesis"])
async def query_historical_experience(
        challenge: BusinessChallenge,
        principal_service: PrincipalService = Depends(get_any_principal)) -> QueryHistoricalExperienceResult:
    """
    Query historical experience for the business challenge.
    :param challenge: The business challenge to query.
    :param principal_service: The principal service for authentication and authorization.
    :return: The business challenge with historical experience problems.
    """

    ## mock historical experience problems
    # Create a mock problem for historical experience
    ## find business challenge from vector db for historical experience
    ## if find similar challenge, return them limit is 2

    ## result is list of BusinessChallengeWithProblems
    # Load the full challenge with problems
    challenge_with_problems: BusinessChallengeWithProblems = await load_full_challenge(challenge.id, principal_service)

    return QueryHistoricalExperienceResult(hasSimilar=False, similarChallenges=[])


## Query Knowledge Base
@router.post("/challenge/agent/query/knowledge_base", tags=["hypothesis"])
async def query_knowledge_base(
        challenge: BusinessChallenge,
        principal_service: PrincipalService = Depends(get_any_principal)) -> QueryKnowledgeBaseResult:
    """
    Query the knowledge base for the business challenge.
    :param challenge: The business challenge to query.
    :param principal_service: The principal service for authentication and authorization.
    :return: QueryKnowledgeBaseResult
    """

    # check mcp tools
    # if has mcp for knowledge base, use it to query knowledge base

    related_reports = vector_repository.get_report_history(challenge.title)

    # find summary for this report if not call api generate summary for this report for this new message

    query_know_base_result = QueryKnowledgeBaseResult()
    query_know_base_result.hasKnowledgeBase = False
    # TODO implement logic to check if there are related reports in the knowledge base
    query_know_base_result.knowledgeBaseChallenges = []

    # Load the full challenge with problems
    return query_know_base_result





# Build Business Problem Simulation Environment
@router.post("/challenge/agent/simulate", tags=["hypothesis"])
async def build_business_problem_simulation_environment(
        challenge: BusinessChallenge,
        principal_service: PrincipalService = Depends(get_any_principal)) -> SimulationResult:
    """
    Build a simulation environment for the business problem.
    :param challenge: The business challenge to simulate.
    :param principal_service: The principal service for authentication and authorization.
    :return: The business challenge with simulated problems.
    """

    analysis_service: AnalysisService = get_analysis_service(principal_service)

    metrics: List[MetricFlowMetric] = await load_all_metrics_from_mf(principal_service)

    context = ChallengeAgentContext(
        challenge_id=challenge.id,
        context="",
        principal_service=principal_service,
        all_metrics=metrics,
        challenge_result=ChallengeAnalysisResult(challengeTitle=challenge.title)
    )

    challenge_from_db: BusinessChallengeWithProblems = await load_full_challenge(challenge.id, principal_service)
    # print(challenge_from_db)
    # Load the full challenge with problems
    simulate_env = ChallengeSimulateEnv(challenge=challenge_from_db, context=context)

    context: ChallengeAgentContext = simulate_env.execute_steps()

    def save_analysis_data(analysis_data: AnalysisData):
        """
        Save the analysis data to the database.
        :param analysis_data: The analysis data to save.
        """
        if analysis_data.analysis_id is None:
            analysis_data.analysis_id = str(analysis_service.snowflakeGenerator.next_id())
            analysis_data.tenantId = principal_service.get_tenant_id()
            analysis_data.userId = principal_service.get_user_id()
            analysis_service.create(analysis_data)
        else:
            analysis_service.update_by_hypothesis_id(analysis_data.hypothesis_id, analysis_data)


    for item_id, analysis_data in context.challenge_result.hypothesisResultDict.items():
        # analysis_data = context.result_data[item_id]
        trans(analysis_service, lambda: save_analysis_data(analysis_data))

    print(dspy.inspect_history(5))

    return SimulationResult(simulationId=str(analysis_service.snowflakeGenerator.next_id()),challenge=simulate_env.get_current_challenge(), result=context.challenge_result)

def convert_challenge_insight_to_markdown(challenge_insight_result: ChallengeInsightResult) -> str:
    """
    Convert the challenge insight result to markdown format.
    :param challenge_insight_result: The challenge insight result to convert.
    :return: The markdown formatted string.
    """
    markdown = f"### Challenge Insight Result\n\n"
    markdown += f"- **Answer for Conclusion**: {challenge_insight_result["answerForConclusion"]}\n"
    markdown += f"- **Summary for Questions**: {challenge_insight_result["summaryForQuestions"]}\n"
    markdown += f"- **Future Analysis**: {challenge_insight_result["futureAnalysis"]}\n"
    markdown += f"- **Future Business Action**: {challenge_insight_result["futureBusinessAction"]}\n"
    return markdown





# ## Attempt to Answer Business Challenge
@router.post("/challenge/agent/answer/evaluation", tags=["hypothesis"])
async def attempt_to_answer_business_challenge(
        simulation_result: SimulationResult,
        principal_service: PrincipalService = Depends(get_any_principal)) -> SimulationResult:
    result =  simulation_result.result

    evaluation_challenge_answer = EvaluationChallengeAnswerModule()

    result_response =  evaluation_challenge_answer(challenge = result["challengeTitle"],conclusion=convert_challenge_insight_to_markdown(result["challengeInsightResult"]),question_evaluation_markdown=result["questionAnswerMarkdown"])

    result["evaluation"]= result_response.response

    # simulation_result.result = result

    return simulation_result




## Build Conclusions and Generate Analysis Report
@router.post("/challenge/agent/conclusions", tags=["hypothesis"])
async def build_conclusions_and_generate_analysis_report(
        simulation_result: SimulationResult,
        principal_service: PrincipalService = Depends(get_any_principal)) -> SimulationResult:
    """
    Build conclusions and generate an analysis report for the business challenge.
    :param simulation_result: The business challenge to analyze.
    :param principal_service: The principal service for authentication and authorization.
    :return: The business challenge with conclusions and analysis report.
    """
    # Load the full challenge with problems
    # 构建一个challenge 分析结论对象 ，构建一个markdown的版本

    analysis_report = build_analysis_report_md(simulation_result)

    challenge = simulation_result.challenge

    # simulation_result.result.challengeMarkdown


    simulation_result.result["challengeMarkdown"] = analysis_report

    return simulation_result
