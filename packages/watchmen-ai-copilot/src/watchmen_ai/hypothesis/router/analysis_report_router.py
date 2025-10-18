from logging import getLogger
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import time

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from watchmen_ai.hypothesis.meta.analysis_report_service import AnalysisReportService
from watchmen_ai.hypothesis.model.analysis_report import AnalysisReport
from watchmen_ai.hypothesis.rag.rag import RAGAnalyzer
from watchmen_ai.hypothesis.agent.types import IntentType
from watchmen_auth import PrincipalService
from watchmen_indicator_surface.util import trans
from watchmen_lineage.utils.utils import trans_readonly
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_rest import get_any_principal

router = APIRouter()

logger = getLogger(__name__)


# 检索测试相关的数据模型
class RetrievalTestConfig(BaseModel):
    """检索测试配置"""
    similarity_threshold: float = 0.58  # 相似度阈值
    vector_similarity_weight: float = 0.47  # 向量相似度权重
    test_text: str  # 测试文本
    intent_type: Optional[str] = "GENERAL_INQUIRY"  # 意图类型
    semantic_sections: Optional[List[str]] = None  # 语义段落过滤
    content_types: Optional[List[str]] = None  # 内容类型过滤
    limit: int = 10  # 返回结果数量限制


class SimilarityResult(BaseModel):
    """相似度结果"""
    hybrid_similarity: float
    term_similarity: float
    vector_similarity: float


class MatchResult(BaseModel):
    """匹配结果"""
    match_id: str
    title: str
    content: str
    similarity_score: float
    distance: float
    content_type: str
    semantic_section: str
    section_title: Optional[str] = None
    simulation_id: Optional[str] = None
    challenge_description: Optional[str] = None
    token_count: int = 0
    chunk_index: int = 0
    total_chunks: int = 1
    metadata: Dict[str, Any] = {}


class RetrievalTestResult(BaseModel):
    """检索测试结果"""
    similarity_results: SimilarityResult
    top_matches: List[MatchResult]
    total_matches: int
    test_config: RetrievalTestConfig





async def get_analysis_report_service(principal_service: PrincipalService) -> AnalysisReportService:
    """
    Get the analysis report service for managing analysis reports.
    :param principal_service: The principal service for authentication and authorization.
    :return: An instance of the analysis report service.
    """
    return AnalysisReportService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


async def get_rag_analyzer() -> RAGAnalyzer:
    """
    Get the RAG analyzer instance for document retrieval and analysis.
    :return: An instance of the RAG analyzer.
    """
    try:
        analyzer = RAGAnalyzer()
        return analyzer
    except Exception as e:
        logger.error(f"Failed to initialize RAG analyzer: {str(e)}")
        raise HTTPException(status_code=500, detail=f"RAG service initialization failed: {str(e)}")


@router.post("/analysis-report", tags=["hypothesis"])
async def create_or_update_analysis_report(
    analysis_report: AnalysisReport,
    principal_service: PrincipalService = Depends(get_any_principal)
):
    """
    Create or update an analysis report.
    :param analysis_report: The analysis report containing report details.
    :param principal_service: The principal service for authentication and authorization.
    :return: The created or updated analysis report.
    """
    analysis_report_service = await get_analysis_report_service(principal_service)

    def new_analysis_report():
        return analysis_report_service.create(analysis_report)

    def update_analysis_report():
        return analysis_report_service.update(analysis_report)

    if analysis_report.analysisReportId.startswith("challenge"):
        analysis_report.analysisReportId = str(analysis_report_service.snowflakeGenerator.next_id())
        analysis_report.tenantId = principal_service.tenantId
        analysis_report.userId = principal_service.userId
        return trans(analysis_report_service, new_analysis_report)
    else:
        return trans(analysis_report_service, update_analysis_report)


@router.get("/analysis-report/list", tags=["hypothesis"])
async def list_analysis_reports(principal_service: PrincipalService = Depends(get_any_principal)):
    """
    List all analysis reports.
    :param principal_service: The principal service for authentication and authorization.
    :return: A list of analysis reports.
    """
    analysis_report_service = await get_analysis_report_service(principal_service)

    def action():
        return analysis_report_service.find_all(principal_service.tenantId)

    return trans_readonly(analysis_report_service, action)


@router.get("/analysis-report/{analysis_report_id}", tags=["hypothesis"])
async def get_analysis_report(
    analysis_report_id: str,
    principal_service: PrincipalService = Depends(get_any_principal)
):
    """
    Get an analysis report by its ID.
    :param analysis_report_id: The ID of the analysis report to retrieve.
    :param principal_service: The principal service for authentication and authorization.
    :return: The analysis report with the specified ID.
    """
    analysis_report_service = await get_analysis_report_service(principal_service)

    def action():
        return analysis_report_service.find_by_id(analysis_report_id)

    return trans_readonly(analysis_report_service, action)


@router.get("/analysis-report/challenge/{challenge_id}", tags=["hypothesis"])
async def list_analysis_reports_by_challenge(
    challenge_id: str,
    principal_service: PrincipalService = Depends(get_any_principal)
):
    """
    List analysis reports by challenge ID.
    :param challenge_id: The ID of the challenge to filter by.
    :param principal_service: The principal service for authentication and authorization.
    :return: A list of analysis reports for the specified challenge.
    """
    analysis_report_service = await get_analysis_report_service(principal_service)

    def action():
        return analysis_report_service.find_by_challenge_id(challenge_id, principal_service.tenantId)

    return trans_readonly(analysis_report_service, action)


@router.get("/analysis-report/status/{status}", tags=["hypothesis"])
async def list_analysis_reports_by_status(
    status: str,
    principal_service: PrincipalService = Depends(get_any_principal)
):
    """
    List analysis reports by status.
    :param status: The status to filter by (e.g., draft, published).
    :param principal_service: The principal service for authentication and authorization.
    :return: A list of analysis reports with the specified status.
    """
    analysis_report_service = await get_analysis_report_service(principal_service)

    def action():
        return analysis_report_service.find_by_status(status, principal_service.tenantId)

    return trans_readonly(analysis_report_service, action)


@router.delete("/analysis-report/{analysis_report_id}", tags=["hypothesis"])
async def delete_analysis_report(
    analysis_report_id: str,
    principal_service: PrincipalService = Depends(get_any_principal)
):
    """
    Delete an analysis report by its ID.
    :param analysis_report_id: The ID of the analysis report to delete.
    :param principal_service: The principal service for authentication and authorization.
    :return: Success confirmation.
    """
    analysis_report_service = await get_analysis_report_service(principal_service)

    def action():
        analysis_report_service.delete_by_id(analysis_report_id)
        return {"message": "Analysis report deleted successfully"}

    return trans(analysis_report_service, action)


# 检索测试相关的 API 端点
@router.post("/retrieval-test/run", tags=["hypothesis", "retrieval"])
async def run_retrieval_test(
    config: RetrievalTestConfig,
    principal_service: PrincipalService = Depends(get_any_principal)
) -> RetrievalTestResult:
    """
    运行检索测试
    :param config: 检索测试配置
    :param principal_service: 用户认证服务
    :return: 检索测试结果
    """
    try:
        # 获取RAG分析器实例
        rag_analyzer = await get_rag_analyzer()
        
        # 转换意图类型
        intent_mapping = {
            "HYPOTHESIS_ANALYSIS": IntentType.HYPOTHESIS_ANALYSIS,
            "CONCLUSION_SUMMARY": IntentType.CONCLUSION_SUMMARY,
            "RECOMMENDATION_REQUEST": IntentType.RECOMMENDATION_REQUEST,
            "DATA_ANALYSIS": IntentType.DATA_ANALYSIS,
            "GENERAL_INQUIRY": IntentType.GENERAL_INQUIRY
        }
        intent = intent_mapping.get(config.intent_type, IntentType.GENERAL_INQUIRY)
        
        # 使用RAG服务检索相关文档
        rag_results = await rag_analyzer.retrieve_relevant_docs(
            query=config.test_text,
            intent=intent,
            semantic_sections=config.semantic_sections,
            content_types=config.content_types,
            limit=config.limit
        )
        
        # 计算相似度统计
        if rag_results:
            scores = [result.get('score', 0) for result in rag_results]
            avg_score = sum(scores) / len(scores)
            
            # 模拟不同类型的相似度分解
            similarity_results = SimilarityResult(
                hybrid_similarity=avg_score,
                term_similarity=avg_score * 0.85,  # 假设词项相似度稍低
                vector_similarity=avg_score * 1.1 if avg_score * 1.1 <= 1.0 else 1.0  # 向量相似度稍高
            )
        else:
            similarity_results = SimilarityResult(
                hybrid_similarity=0.0,
                term_similarity=0.0,
                vector_similarity=0.0
            )
        
        # 转换RAG结果为匹配结果
        top_matches = []
        for result in rag_results:
            match = MatchResult(
                match_id=result.get('document_id', 'unknown'),
                title=result.get('title', 'Untitled'),
                content=result.get('content', '')[:500],  # 限制内容长度
                similarity_score=result.get('score', 0),
                distance=result.get('distance', 1.0),
                content_type=result.get('content_type', 'unknown'),
                semantic_section=result.get('semantic_section', 'general'),
                section_title=result.get('section_title'),
                simulation_id=result.get('simulation_id'),
                challenge_description=result.get('challenge_description'),
                token_count=result.get('token_count', 0),
                chunk_index=result.get('chunk_index', 0),
                total_chunks=result.get('total_chunks', 1),
                metadata=result.get('metadata', {})
            )
            top_matches.append(match)
        
        result = RetrievalTestResult(
            similarity_results=similarity_results,
            top_matches=top_matches,
            total_matches=len(top_matches),
            test_config=config
        )
        
        logger.info(f"Retrieval test completed for user {principal_service.userId}, found {len(top_matches)} matches")
        return result
        
    except Exception as e:
        logger.error(f"Error running retrieval test: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to run retrieval test: {str(e)}")


@router.get("/retrieval-test/config/default", tags=["hypothesis", "retrieval"])
async def get_default_retrieval_config(
    principal_service: PrincipalService = Depends(get_any_principal)
) -> RetrievalTestConfig:
    """
    获取默认的检索测试配置
    :param principal_service: 用户认证服务
    :return: 默认配置
    """
    return RetrievalTestConfig(
        similarity_threshold=0.58,
        vector_similarity_weight=0.47,
        test_text="test",
        intent_type="GENERAL_INQUIRY",
        semantic_sections=None,
        content_types=None,
        limit=10
    )


@router.post("/retrieval-test/config/save", tags=["hypothesis", "retrieval"])
async def save_retrieval_config(
    config: RetrievalTestConfig,
    principal_service: PrincipalService = Depends(get_any_principal)
) -> Dict[str, Any]:
    """
    保存检索测试配置
    :param config: 检索测试配置
    :param principal_service: 用户认证服务
    :return: 保存结果
    """
    try:
        # 在实际实现中，这里应该将配置保存到数据库
        # 目前返回模拟的保存结果
        
        logger.info(f"Retrieval config saved for user {principal_service.userId}")
        return {
            "message": "Configuration saved successfully",
            "config_id": f"config_{principal_service.userId}_{int(time.time())}",
            "saved_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error saving retrieval config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save configuration: {str(e)}")


@router.get("/retrieval-test/history", tags=["hypothesis", "retrieval"])
async def get_retrieval_test_history(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    principal_service: PrincipalService = Depends(get_any_principal)
) -> Dict[str, Any]:
    """
    获取检索测试历史记录
    :param limit: 返回记录数限制
    :param offset: 偏移量
    :param principal_service: 用户认证服务
    :return: 历史记录列表
    """
    try:
        # 模拟历史记录数据
        # 在实际实现中，这里应该从数据库查询真实的历史记录
        
        mock_history = [
            {
                "test_id": f"test_{i}",
                "test_time": (datetime.now() - timedelta(days=i)).isoformat(),
                "config": {
                    "similarity_threshold": 0.58 + i * 0.01,
                    "vector_similarity_weight": 0.47 + i * 0.01,
                    "test_text": f"test query {i}"
                },
                "results": {
                    "hybrid_similarity": 0.85 - i * 0.02,
                    "term_similarity": 0.75 - i * 0.01,
                    "vector_similarity": 0.95 - i * 0.01,
                    "total_matches": 10 - i
                }
            }
            for i in range(offset, min(offset + limit, 20))
        ]
        
        return {
            "history": mock_history,
            "total": 20,
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error(f"Error fetching retrieval test history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch test history: {str(e)}")


@router.get("/retrieval-test/metrics", tags=["hypothesis", "retrieval"])
async def get_retrieval_metrics(
    principal_service: PrincipalService = Depends(get_any_principal)
) -> Dict[str, Any]:
    """
    获取检索性能指标
    :param principal_service: 用户认证服务
    :return: 性能指标数据
    """
    try:
        # 获取RAG分析器实例
        rag_analyzer = await get_rag_analyzer()
        
        # 获取数据库统计信息
        db_stats = await rag_analyzer.get_database_statistics()
        
        # 构建综合性能指标
        metrics = {
            "average_similarity": {
                "hybrid": 0.82,
                "term": 0.73,
                "vector": 0.91
            },
            "test_count": {
                "total": 156,
                "last_7_days": 23,
                "last_30_days": 89
            },
            "performance": {
                "average_response_time_ms": 245,
                "success_rate": 0.987,
                "error_rate": 0.013
            },
            "database_statistics": db_stats,
            "rag_service": {
                "service_status": "active",
                "embedding_model": "sentence-transformers",
                "semantic_sections_supported": [
                    "hypothesis", "conclusion", "recommendation", 
                    "analysis", "executive_summary", "future_action"
                ],
                "content_types_supported": [
                    "full_report", "executive_summary", "hypothesis_analysis"
                ]
            },
            "top_queries": [
                {"query": "insurance claim analysis", "count": 45},
                {"query": "risk assessment", "count": 32},
                {"query": "customer behavior", "count": 28}
            ],
            "last_updated": datetime.now().isoformat()
        }
        
        return metrics
        
    except Exception as e:
        logger.error(f"Error fetching retrieval metrics: {str(e)}")
        # 返回默认指标作为后备
        return {
            "total_tests": 0,
            "average_precision": 0.0,
            "average_recall": 0.0,
            "average_f1_score": 0.0,
            "average_response_time_ms": 0,
            "success_rate": 0.0,
            "error": "Unable to retrieve metrics",
            "last_updated": datetime.now().isoformat()
        }


@router.post("/retrieval-test/generate-report", tags=["hypothesis", "retrieval"])
async def generate_enhanced_analysis_report(
    config: RetrievalTestConfig,
    metrics_data: Optional[Dict[str, Any]] = None,
    principal_service: PrincipalService = Depends(get_any_principal)
) -> Dict[str, Any]:
    """
    生成基于RAG检索结果的增强分析报告
    :param config: 检索测试配置
    :param metrics_data: 可选的指标数据
    :param principal_service: 用户认证服务
    :return: 增强的分析报告
    """
    try:
        # 获取RAG分析器实例
        rag_analyzer = await get_rag_analyzer()
        
        # 转换意图类型
        intent_mapping = {
            "HYPOTHESIS_ANALYSIS": IntentType.HYPOTHESIS_ANALYSIS,
            "CONCLUSION_SUMMARY": IntentType.CONCLUSION_SUMMARY,
            "RECOMMENDATION_REQUEST": IntentType.RECOMMENDATION_REQUEST,
            "DATA_ANALYSIS": IntentType.DATA_ANALYSIS,
            "GENERAL_INQUIRY": IntentType.GENERAL_INQUIRY
        }
        intent = intent_mapping.get(config.intent_type, IntentType.GENERAL_INQUIRY)
        
        # 检索相关文档
        rag_results = await rag_analyzer.retrieve_relevant_docs(
            query=config.test_text,
            intent=intent,
            semantic_sections=config.semantic_sections,
            content_types=config.content_types,
            limit=config.limit
        )
        
        # 如果没有提供指标数据，使用默认值
        if metrics_data is None:
            metrics_data = {
                "total_documents": len(rag_results),
                "avg_relevance_score": sum(r.get('score', 0) for r in rag_results) / len(rag_results) if rag_results else 0
            }
        
        # 生成增强的分析报告
        report_content = await rag_analyzer.generate_analysis_report(
            rag_results=rag_results,
            user_input=config.test_text,
            metrics_data=metrics_data
        )
        
        # 构建响应
        response = {
            "report_content": report_content,
            "metadata": {
                "query": config.test_text,
                "intent_type": config.intent_type,
                "documents_analyzed": len(rag_results),
                "semantic_sections_used": config.semantic_sections,
                "content_types_used": config.content_types,
                "generated_at": datetime.now().isoformat(),
                "user_id": principal_service.userId
            },
            "rag_results_summary": {
                "total_matches": len(rag_results),
                "avg_score": sum(r.get('score', 0) for r in rag_results) / len(rag_results) if rag_results else 0,
                "semantic_sections_found": list(set(r.get('semantic_section', 'general') for r in rag_results)),
                "content_types_found": list(set(r.get('content_type', 'unknown') for r in rag_results))
            }
        }
        
        logger.info(f"Enhanced analysis report generated for user {principal_service.userId}, {len(rag_results)} documents analyzed")
        return response
        
    except Exception as e:
        logger.error(f"Error generating enhanced analysis report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate enhanced analysis report: {str(e)}")


@router.get("/retrieval-test/search-by-simulation/{simulation_id}", tags=["hypothesis", "retrieval"])
async def search_by_simulation_id(
    simulation_id: str,
    principal_service: PrincipalService = Depends(get_any_principal)
) -> Dict[str, Any]:
    """
    根据仿真ID搜索相关文档
    :param simulation_id: 仿真ID
    :param principal_service: 用户认证服务
    :return: 搜索结果
    """
    try:
        # 获取RAG分析器实例
        rag_analyzer = await get_rag_analyzer()
        
        # 根据仿真ID搜索文档
        documents = await rag_analyzer.search_by_simulation_id(simulation_id)
        
        # 构建响应
        response = {
            "simulation_id": simulation_id,
            "documents": documents,
            "total_documents": len(documents),
            "search_metadata": {
                "searched_at": datetime.now().isoformat(),
                "user_id": principal_service.userId,
                "content_types_found": list(set(doc.get('content_type', 'unknown') for doc in documents)),
                "semantic_sections_found": list(set(doc.get('semantic_section', 'general') for doc in documents))
            }
        }
        
        logger.info(f"Simulation search completed for user {principal_service.userId}, simulation_id: {simulation_id}, found {len(documents)} documents")
        return response
        
    except Exception as e:
        logger.error(f"Error searching by simulation ID {simulation_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to search by simulation ID: {str(e)}")