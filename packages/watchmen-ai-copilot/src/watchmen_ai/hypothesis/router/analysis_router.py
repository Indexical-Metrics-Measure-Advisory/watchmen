from logging import getLogger
from typing import List
import re

from fastapi import APIRouter, Depends
from watchmen_ai.hypothesis.model.analysis_report import AnalysisReport, AnalysisReportHeader
from watchmen_ai.hypothesis.rag.rag_emb_service import get_rag_embedding_service
from watchmen_ai.hypothesis.report.markdown_report import build_analysis_report_md
from watchmen_utilities import get_current_time_in_seconds
from datetime import datetime

from watchmen_ai.hypothesis.meta.analysis_meta_service import AnalysisService
from watchmen_ai.hypothesis.meta.analysis_report_service import AnalysisReportService
from watchmen_ai.hypothesis.meta.metric_meta_service import MetricService
from watchmen_ai.hypothesis.model.analysis import BusinessChallengeWithProblems, AnalysisData, BusinessProblemWithHypotheses, HypothesisWithMetrics
from watchmen_ai.hypothesis.model.analysis_report import AnalysisReport
from watchmen_ai.hypothesis.model.common import SimulationResult
from watchmen_ai.hypothesis.model.metrics import MetricType
from watchmen_ai.hypothesis.service.analysis_service import load_objective_by_metric
from watchmen_ai.hypothesis.service.challenge_service import save_full_challenge
from watchmen_ai.hypothesis.service.metric_service import find_dimension_by_metric, find_indicator_by_objective
from watchmen_ai.hypothesis.utils.unicode_utils import sanitize_object_unicode
from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.data import ObjectiveDataService
from watchmen_indicator_kernel.meta import ObjectiveService, IndicatorService
from watchmen_indicator_surface.util import trans_readonly, trans
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.indicator import Objective, ObjectiveTarget, Indicator
from watchmen_rest import get_any_principal

router = APIRouter()

logger = getLogger(__name__)

from watchmen_ai.hypothesis.service.analysis_service import (
    save_simulation_result,
    list_simulation_results,
    get_simulation_result,
    load_simulation_result_by_challenge_id
)

def sanitize_content_for_mysql(content: str) -> str:
    """
    Sanitize content by removing or replacing Unicode characters that cause MySQL encoding issues.
    This function removes emojis and other 4-byte UTF-8 characters that MySQL utf8 charset cannot handle.
    """
    if not content:
        return content
    
    # Remove emojis and other 4-byte UTF-8 characters
    # This regex matches most emoji ranges
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map symbols
        "\U0001F1E0-\U0001F1FF"  # flags (iOS)
        "\U00002702-\U000027B0"
        "\U000024C2-\U0001F251"
        "]+", flags=re.UNICODE
    )
    
    # Replace emojis with text equivalents for common ones
    replacements = {
        "📌": "[PIN]",
        "🎯": "[TARGET]",
        "📊": "[CHART]",
        "✅": "[CHECK]",
        "🧪": "[TEST]",
        "🔍": "[SEARCH]",
        "🚀": "[ROCKET]",
        "⏳": "[PENDING]",
        "🔄": "[PROCESSING]",
        "📋": "[CLIPBOARD]",
        "🔗": "[LINK]",
        "1️⃣": "1.",
        "2️⃣": "2.",
        "3️⃣": "3.",
        "4️⃣": "4.",
        "5️⃣": "5.",
        "6️⃣": "6.",
        "7️⃣": "7.",
        "8️⃣": "8.",
        "9️⃣": "9.",
        "🔟": "10."
    }
    
    # Apply specific replacements first
    for emoji, replacement in replacements.items():
        content = content.replace(emoji, replacement)
    
    # Remove any remaining emojis
    content = emoji_pattern.sub('', content)
    
    # Remove other problematic 4-byte UTF-8 characters
    # Keep only characters that are safe for MySQL utf8 charset
    content = content.encode('utf-8', errors='ignore').decode('utf-8', errors='ignore')
    
    return content


def get_analysis_report_service(principal_service: PrincipalService) -> AnalysisReportService:
    """
    Get the analysis report service for managing analysis reports.
    :param principal_service: The principal service for authentication and authorization.
    :return: An instance of the analysis report service.
    """
    return AnalysisReportService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_objective_service(principal_service: PrincipalService) -> ObjectiveService:
    return ObjectiveService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_indicator_service(principal_service: PrincipalService) -> IndicatorService:
    return IndicatorService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_metric_service(principal_service: PrincipalService) -> MetricService:
    return MetricService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_objective_data_service(objective: Objective, principal_service: PrincipalService) -> ObjectiveDataService:
    return ObjectiveDataService(objective, principal_service)


def get_analysis_data_service(principal_service: PrincipalService) -> AnalysisService:
    """
    Get the analysis data service for the given objective.
    :param objective: The objective for which to get the analysis data service.
    :param principal_service: The principal service for authentication and authorization.
    :return: The analysis data service.
    """
    return AnalysisService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


async def find_all_indicator_by_target_list(objective_target_list: List[ObjectiveTarget],
                                            principal_service: PrincipalService) -> List[Indicator]:
    """
    find all indicator by target list
    :param principal_service:
    :param objective_target_list:
    :return:
    """
    indicator_list: List[Indicator] = []
    for objective_target in objective_target_list:
        if objective_target.indicatorId is not None and len(objective_target.indicatorId) > 0:
            indicator_list.append(objective_target.indicatorId)

    indicator_service = get_indicator_service(principal_service)

    def action():
        # noinspection PyTypeChecker
        return indicator_service.find_by_ids(indicator_list, principal_service.get_tenant_id())

    return trans_readonly(indicator_service, action)


async def generate_analysis_data_by_metric(metric: MetricType, principal_service: PrincipalService, start_date,
                                           end_date):
    """
    generate analysis data by metric
    :param metric:
    :param principal_service:
    :return:
    """
    # load dimension for metrics
    metric_service = get_metric_service(principal_service)
    dimension_list = await find_dimension_by_metric(metric, principal_service)

    objective: Objective = await load_objective_by_metric(metric)
    indicator_service = get_indicator_service(principal_service)

    # load data for metrics
    objective_data_service: ObjectiveDataService = get_objective_data_service(objective, principal_service)

    # find key time dimension
    # pass start and end date

    find_indicator_by_objective(objective, metric.targetId, indicator_service)

    #

    return None


def find_indicator_by_hypothesis(principal_service: PrincipalService):
    indicator_service = get_indicator_service(principal_service)

    def action():
        # noinspection PyTypeChecker
        return indicator_service.find_all(principal_service.tenantId)

    return trans_readonly(indicator_service, action)


async def save_challenge_data(challenge: BusinessChallengeWithProblems, principal_service: PrincipalService):
    """
    Save challenge data to the database.
    :param challenge: The challenge data to save.
    :param principal_service: The principal service for authentication and authorization.
    :return: The saved challenge data.
    """

    # Save the challenge data
    return await save_full_challenge(challenge, principal_service)


def build_analysis_report(challenge: BusinessChallengeWithProblems, simulation_result: SimulationResult,
                        principal_service: PrincipalService) -> AnalysisReport:
    """
    Build an analysis report based on the challenge and simulation result.
    :param challenge: The business challenge with problems.
    :param simulation_result: The simulation result to include in the report.
    :param principal_service: The principal service for authentication and authorization.
    :return: The constructed analysis report.
    """
    challenge = BusinessChallengeWithProblems.model_validate(challenge)
    
    # Generate unique analysis report ID
    current_time = get_current_time_in_seconds()
    analysis_report_id = f"analysis_report_{challenge.id}_{current_time}"
    
    # Count problems and hypotheses
    total_problems = len(challenge.problems) if challenge.problems else 0
    total_hypotheses = 0
    total_metrics = 0
    
    # Count hypotheses and metrics from the challenge
    for problem in challenge.problems or []:
        problem = BusinessProblemWithHypotheses.model_validate(problem)
        if problem.hypotheses:
            total_hypotheses += len(problem.hypotheses)
            # Count metrics from hypothesis results if available
            for hypothesis in problem.hypotheses:
                hypothesis = HypothesisWithMetrics.model_validate(hypothesis)
                if (simulation_result.result and 
                    simulation_result.result["hypothesisResultDict"] and
                    hypothesis.id in simulation_result.result["hypothesisResultDict"]):
                    hypothesis_result = simulation_result.result["hypothesisResultDict"][hypothesis.id]
                    if hasattr(hypothesis_result, 'analysis_metrics') and hypothesis_result["analysis_metrics"]:
                        total_metrics += len(hypothesis_result["analysis_metrics"])
    
    # Create analysis report header
    current_date = datetime.now().strftime("%Y-%m-%d")
    header = AnalysisReportHeader(
        timePeriod=current_date,
        challengeName=challenge.title,
        questionCount=total_problems,
        hypothesisCount=total_hypotheses,
        metricCount=total_metrics
    )
    
    # Generate markdown content using existing function
    markdown_content = build_analysis_report_md(simulation_result)
    
    # Sanitize content to prevent MySQL encoding issues
    sanitized_content = sanitize_content_for_mysql(markdown_content)
    
    # Create and return the analysis report
    analysis_report = AnalysisReport(
        analysisReportId=analysis_report_id,
        header=header,
        content=sanitized_content,
        challenge_id=challenge.id,
        status="draft"  # Default status
    )
    
    # Set user and tenant information
    analysis_report.userId = principal_service.get_user_id()
    analysis_report.tenantId = principal_service.get_tenant_id()
    
    return analysis_report

async def push_to_knowledge_base(simulation_result: SimulationResult):
    """
    Push the analysis report to the knowledge base.
    :param simulation_result: The simulation result containing the analysis report.
    """
    rag_service = get_rag_embedding_service()

    # Push the document to the RAG service
    try:
        document_ids = await rag_service.store_simulation_result(simulation_result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        logger.error(f"Failed to push simulation result to knowledge base: {str(e)}")



@router.post("/analysis/save", tags=["hypothesis"])
async def save_challenge_analysis_result(
        simulation_result: SimulationResult,
        principal_service: PrincipalService = Depends(get_any_principal)):
    analysis_report_service = get_analysis_report_service(principal_service)
    if simulation_result.simulationId is None:
        simulation_result.simulationId = str(analysis_report_service.snowflakeGenerator.next_id())
    await save_full_challenge(simulation_result.challenge, principal_service)



    storage_key = save_simulation_result(simulation_result, principal_service)

    # build analysis report base on simulation_result
    analysis_report = build_analysis_report(simulation_result.challenge, simulation_result, principal_service)
    
    # Sanitize the analysis report object to handle Unicode issues
    analysis_report = sanitize_object_unicode(analysis_report)

    def save():
        try:
            analysis_report_service.create(analysis_report)
            logger.info(f"Successfully saved analysis report with ID: {analysis_report.analysisReportId}")
        except Exception as e:
            logger.error(f"Failed to save analysis report: {str(e)}")
            # If it's a MySQL encoding error, try to sanitize content further
            if "Incorrect string value" in str(e) or "Data too long" in str(e):
                logger.warning("Detected potential encoding issue, applying additional content sanitization")
                # Apply more aggressive sanitization
                analysis_report.content = sanitize_content_for_mysql(analysis_report.content)
                # Truncate content if it's too long
                if len(analysis_report.content) > 65535:  # TEXT column limit
                    analysis_report.content = analysis_report.content[:65500] + "\n\n[Content truncated due to length limit]"
                # Retry save
                analysis_report_service.create(analysis_report)
                logger.info(f"Successfully saved analysis report after sanitization: {analysis_report.analysisReportId}")
            else:
                raise e

    trans(analysis_report_service, save)
    
    return {
        "success": True,
        "storage_key": storage_key,
        "message": "分析结果已临时保存到内存中"
    }


@router.get("/analysis/list", tags=["hypothesis"])
async def list_challenge_analysis_results(
        principal_service: PrincipalService = Depends(get_any_principal)):
    """
    获取当前用户的所有临时存储的分析结果
    """
    user_results = list_simulation_results(principal_service)

    return {
        "success": True,
        "count": len(user_results),
        "results": user_results
    }


@router.get("/analysis/{storage_key}", tags=["hypothesis"])
async def get_challenge_analysis_result(
        storage_key: str,
        principal_service: PrincipalService = Depends(get_any_principal)):
    """
    根据存储键获取特定的分析结果
    """
    try:
        result = get_simulation_result(storage_key, principal_service)
        return {
            "success": True,
            "result": result
        }
    except ValueError as e:
        return {
            "success": False,
            "message": str(e)
        }
    except PermissionError as e:
        return {
            "success": False,
            "message": str(e)
        }


@router.get("/analysis/hypothesis/{hypothesis_id}", tags=["hypothesis"])
async def load_analysis_data_by_hypothesis(
        hypothesis_id: str,
        principal_service: PrincipalService = Depends(get_any_principal)) -> AnalysisData:
    """
    Load analysis data by hypothesis ID.
    :param hypothesis_id: The ID of the hypothesis.
    :param principal_service: The principal service for authentication and authorization.
    :return: The loaded business challenge with problems.
    """

    analysis_service = get_analysis_data_service(principal_service)

    def load_analysis_data():
        return analysis_service.find_by_hypothesis_id(hypothesis_id, principal_service.get_tenant_id())

    analysis_data_list: List[AnalysisData] = trans_readonly(analysis_service, load_analysis_data)

    # find last updated analysis data
    if analysis_data_list and len(analysis_data_list) > 0:
        result = analysis_data_list[-1]
        # print("result", result.data_explain_dict)
        return result
    else:
        return None


@router.get("/analysis/challenge/{challenge_id}", tags=["hypothesis"])
async def load_simulation_by_challenge_id(
        challenge_id: str,
        principal_service: PrincipalService = Depends(get_any_principal)):
    """
    根据 challenge_id 从临时存储中加载 SimulationResult
    :param challenge_id: 挑战的ID
    :param principal_service: 用于身份验证和授权的主体服务
    :return: 匹配的 SimulationResult 或错误信息
    """
    try:
        result = load_simulation_result_by_challenge_id(challenge_id)
        return {
            "success": True,
            "storage_key": result["storage_key"],
            "simulation_result": result["simulation_result"],
            "timestamp": result["timestamp"],
            "message": f"成功加载 challenge_id 为 {challenge_id} 的分析结果"
        }
    except ValueError as e:
        return {
            "success": False,
            "message": str(e)
        }
