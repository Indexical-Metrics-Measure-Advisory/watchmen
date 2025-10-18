from typing import List, Dict, Any, Optional

from watchmen_ai.hypothesis.agent.types import IntentType
from watchmen_ai.hypothesis.rag.rag_emb_service import (
    get_rag_embedding_service, 
    search_similar_content, 
    search_semantic_content,
    VectorSearchResult
)
from watchmen_utilities import ExtendedBaseModel


class RAGAnalyzer(ExtendedBaseModel):
    """增强的RAG分析器，支持语义搜索和智能文档检索"""

    def __init__(self):
        super().__init__()
        self.rag_service = get_rag_embedding_service()

    async def retrieve_relevant_docs(self, query: str, intent: IntentType, 
                                    semantic_sections: Optional[List[str]] = None,
                                    content_types: Optional[List[str]] = None,
                                    limit: int = 10) -> List[Dict[str, Any]]:
        """检索相关文档，支持语义段落和内容类型过滤
        
        Args:
            query: 搜索查询
            intent: 意图类型
            semantic_sections: 语义段落类型过滤 ['hypothesis', 'conclusion', 'recommendation', 'analysis', 'executive_summary', 'future_action']
            content_types: 内容类型过滤 ['full_report', 'executive_summary', 'hypothesis_analysis']
            limit: 返回结果数量限制
        """
        try:
            # 根据意图类型选择合适的语义段落
            if semantic_sections is None:
                semantic_sections = self._get_semantic_sections_by_intent(intent)
            
            # 使用语义搜索获取更精准的结果
            if semantic_sections:
                results = await search_semantic_content(
                    query=query,
                    semantic_sections=semantic_sections,
                    limit=limit
                )
            else:
                # 回退到普通相似性搜索
                results = await self.rag_service.search_similar_challenges(
                    query=query,
                    limit=limit,
                    content_types=content_types
                )
            
            # 转换为字典格式并增强元数据
            converted_results = []
            for result in results:
                doc_dict = {
                    "title": result.document.challenge_title,
                    "content": result.document.markdown_content,
                    "score": result.score,
                    "distance": result.distance,
                    "document_id": result.document.id,
                    "content_type": result.document.content_type,
                    "simulation_id": result.document.simulation_id,
                    "challenge_description": result.document.challenge_description,
                    # 新增的语义信息
                    "semantic_section": result.document.semantic_section,
                    "section_title": result.document.section_title,
                    "token_count": result.document.token_count,
                    "chunk_index": result.document.chunk_index,
                    "total_chunks": result.document.total_chunks,
                    "metadata": result.document.metadata
                }
                converted_results.append(doc_dict)
            
            return converted_results
            
        except Exception as e:
            # 如果语义搜索失败，回退到基础搜索
            results = await search_similar_content(query, limit)
            converted_results = []
            for result in results:
                converted_results.append({
                    "title": result.document.challenge_title,
                    "content": result.document.markdown_content,
                    "score": result.score,
                    "distance": result.distance,
                    "document_id": result.document.id,
                    "content_type": result.document.content_type,
                    "simulation_id": result.document.simulation_id,
                    "challenge_description": result.document.challenge_description,
                    "semantic_section": getattr(result.document, 'semantic_section', 'general'),
                    "section_title": getattr(result.document, 'section_title', ''),
                    "token_count": getattr(result.document, 'token_count', 0),
                    "chunk_index": result.document.chunk_index,
                    "total_chunks": result.document.total_chunks,
                    "metadata": getattr(result.document, 'metadata', {})
                })
            return converted_results


    async def generate_analysis_report(self, rag_results: List[Dict[str, Any]],
                                     user_input: str, metrics_data: Dict[str, Any]) -> str:
        """生成增强的分析报告，基于语义段落和智能内容组织"""
        report_sections = []

        # 添加执行摘要
        report_sections.append("# 智能分析报告")
        report_sections.append(f"**查询内容**: {user_input}")
        report_sections.append(f"**生成时间**: {self._get_current_time()}")
        report_sections.append(f"**数据来源**: {len(rag_results)} 个相关文档")
        
        # 按语义段落类型组织发现
        if rag_results:
            semantic_findings = self._organize_findings_by_semantic_type(rag_results)
            
            # 关键假设
            if 'hypothesis' in semantic_findings:
                report_sections.append("\n## 🔍 关键假设分析")
                for finding in semantic_findings['hypothesis']:
                    report_sections.append(f"### {finding['title']}")
                    report_sections.append(f"**相关度**: {finding['score']:.3f}")
                    report_sections.append(f"**内容摘要**: {finding['content'][:200]}...")
                    if finding['section_title']:
                        report_sections.append(f"**段落**: {finding['section_title']}")
                    report_sections.append("")
            
            # 结论总结
            if 'conclusion' in semantic_findings:
                report_sections.append("\n## 📊 结论总结")
                for finding in semantic_findings['conclusion']:
                    report_sections.append(f"### {finding['title']}")
                    report_sections.append(f"**相关度**: {finding['score']:.3f}")
                    report_sections.append(f"**关键结论**: {finding['content'][:200]}...")
                    report_sections.append("")
            
            # 推荐行动
            if 'recommendation' in semantic_findings:
                report_sections.append("\n## 🎯 推荐行动")
                for finding in semantic_findings['recommendation']:
                    report_sections.append(f"### {finding['title']}")
                    report_sections.append(f"**优先级**: {self._calculate_priority(finding['score'])}")
                    report_sections.append(f"**建议内容**: {finding['content'][:200]}...")
                    report_sections.append("")
            
            # 其他相关分析
            other_sections = {k: v for k, v in semantic_findings.items() 
                            if k not in ['hypothesis', 'conclusion', 'recommendation']}
            if other_sections:
                report_sections.append("\n## 📈 补充分析")
                for section_type, findings in other_sections.items():
                    report_sections.append(f"### {self._get_section_display_name(section_type)}")
                    for finding in findings[:2]:  # 限制每个类型最多2个
                        report_sections.append(f"- **{finding['title']}**: {finding['content'][:150]}...")
                    report_sections.append("")

        # 数据洞察
        if metrics_data:
            report_sections.append("\n## 📊 数据洞察")
            for key, value in metrics_data.items():
                if isinstance(value, dict) and 'trend' in value:
                    trend_indicator = "📈" if value.get('trend', 0) > 0 else "📉" if value.get('trend', 0) < 0 else "➡️"
                    report_sections.append(f"- **{key}**: {value.get('current', 'N/A')} {trend_indicator}")
                else:
                    report_sections.append(f"- **{key}**: {value}")

        # 智能建议
        report_sections.append("\n## 🚀 智能建议")
        suggestions = self._generate_intelligent_suggestions(rag_results, metrics_data)
        for suggestion in suggestions:
            report_sections.append(f"- {suggestion}")
        
        # 相关文档索引
        if rag_results:
            report_sections.append("\n## 📚 相关文档索引")
            for i, result in enumerate(rag_results[:5], 1):
                report_sections.append(
                    f"{i}. **{result['title']}** (相关度: {result['score']:.3f}, "
                    f"类型: {result['content_type']}, 语义段落: {result.get('semantic_section', 'general')})"
                )

        return "\n".join(report_sections)
    
    def _get_semantic_sections_by_intent(self, intent: IntentType) -> List[str]:
        """根据意图类型选择合适的语义段落"""
        intent_mapping = {
            IntentType.HYPOTHESIS_ANALYSIS: ['hypothesis', 'analysis'],
            IntentType.CONCLUSION_SUMMARY: ['conclusion', 'executive_summary'],
            IntentType.RECOMMENDATION_REQUEST: ['recommendation', 'future_action'],
            IntentType.DATA_ANALYSIS: ['analysis', 'conclusion'],
            IntentType.GENERAL_INQUIRY: ['executive_summary', 'conclusion', 'recommendation']
        }
        return intent_mapping.get(intent, ['general'])
    
    def _organize_findings_by_semantic_type(self, rag_results: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """按语义段落类型组织搜索结果"""
        organized = {}
        for result in rag_results:
            semantic_section = result.get('semantic_section', 'general')
            if semantic_section not in organized:
                organized[semantic_section] = []
            organized[semantic_section].append(result)
        
        # 按相关度排序每个类型的结果
        for section_type in organized:
            organized[section_type].sort(key=lambda x: x.get('score', 0), reverse=True)
        
        return organized
    
    def _calculate_priority(self, score: float) -> str:
        """根据相关度分数计算优先级"""
        if score >= 0.8:
            return "🔴 高优先级"
        elif score >= 0.6:
            return "🟡 中优先级"
        else:
            return "🟢 低优先级"
    
    def _get_section_display_name(self, section_type: str) -> str:
        """获取语义段落类型的显示名称"""
        display_names = {
            'hypothesis': '假设分析',
            'conclusion': '结论总结',
            'recommendation': '推荐行动',
            'analysis': '深度分析',
            'executive_summary': '执行摘要',
            'future_action': '未来行动',
            'general': '一般内容'
        }
        return display_names.get(section_type, section_type.title())
    
    def _generate_intelligent_suggestions(self, rag_results: List[Dict[str, Any]], 
                                        metrics_data: Dict[str, Any]) -> List[str]:
        """基于RAG结果和指标数据生成智能建议"""
        suggestions = []
        
        # 基于文档数量的建议
        if len(rag_results) == 0:
            suggestions.append("建议扩展搜索范围或调整查询关键词以获取更多相关信息")
        elif len(rag_results) < 3:
            suggestions.append("相关历史案例较少，建议结合实时数据进行分析")
        
        # 基于语义段落分布的建议
        semantic_types = set(result.get('semantic_section', 'general') for result in rag_results)
        if 'recommendation' not in semantic_types:
            suggestions.append("缺少具体的行动建议，建议查找更多包含推荐措施的历史案例")
        if 'hypothesis' not in semantic_types:
            suggestions.append("建议补充假设分析以更好地理解问题根因")
        
        # 基于指标数据的建议
        if metrics_data:
            trending_down = any(
                isinstance(v, dict) and v.get('trend', 0) < 0 
                for v in metrics_data.values()
            )
            if trending_down:
                suggestions.append("检测到下降趋势，建议优先关注风险控制措施")
        
        # 基于文档质量的建议
        high_quality_docs = [r for r in rag_results if r.get('score', 0) > 0.7]
        if len(high_quality_docs) < len(rag_results) * 0.5:
            suggestions.append("部分匹配文档相关度较低，建议细化查询条件")
        
        # 默认建议
        if not suggestions:
            suggestions.extend([
                "建议结合多个维度的历史数据进行综合分析",
                "关注趋势变化和异常指标，及时调整策略",
                "定期回顾和更新分析模型以提高准确性"
            ])
        
        return suggestions[:5]  # 限制建议数量
    
    def _get_current_time(self) -> str:
        """获取当前时间的格式化字符串"""
        from datetime import datetime
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    async def search_by_simulation_id(self, simulation_id: str) -> List[Dict[str, Any]]:
        """根据仿真ID搜索相关文档"""
        try:
            documents = await self.rag_service.get_challenge_by_simulation_id(simulation_id)
            
            converted_results = []
            for doc in documents:
                doc_dict = {
                    "title": doc.challenge_title,
                    "content": doc.markdown_content,
                    "document_id": doc.id,
                    "content_type": doc.content_type,
                    "simulation_id": doc.simulation_id,
                    "challenge_description": doc.challenge_description,
                    "semantic_section": doc.semantic_section,
                    "section_title": doc.section_title,
                    "token_count": doc.token_count,
                    "chunk_index": doc.chunk_index,
                    "total_chunks": doc.total_chunks,
                    "metadata": doc.metadata,
                    "created_at": doc.created_at
                }
                converted_results.append(doc_dict)
            
            return converted_results
            
        except Exception as e:
            return []
    
    async def get_database_statistics(self) -> Dict[str, Any]:
        """获取数据库统计信息"""
        try:
            return await self.rag_service.get_database_stats()
        except Exception as e:
            return {"error": str(e)}




