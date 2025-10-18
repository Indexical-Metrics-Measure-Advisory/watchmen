from typing import List, Dict, Any, Optional
from datetime import datetime

from watchmen_ai.dspy.module.ask_for_report import AskForReportModule
from watchmen_ai.hypothesis.rag.rag_emb_service import (
    search_semantic_content, 
    search_similar_content,
    get_rag_embedding_service
)
from watchmen_ai.hypothesis.service.analysis_service import load_simulate_result_by_simulation_id
from watchmen_utilities import ExtendedBaseModel




class ReportAnalyzer(ExtendedBaseModel):
    """Historical report analyzer for deep conversation"""

    def __init__(self):
        super().__init__()

    async def retrieve_historical_reports(self, user_query: str, 
                                         semantic_sections: Optional[List[str]] = None,
                                         limit: int = 5) -> List[Dict[str, Any]]:
        """检索相关历史分析报告，支持语义段落过滤和智能回退机制
        
        Args:
            user_query: 用户查询
            semantic_sections: 语义段落类型过滤，默认为 ["executive_summary", "conclusion", "recommendation"]
            limit: 返回结果数量限制
        """
        if semantic_sections is None:
            semantic_sections = ["executive_summary", "conclusion", "recommendation"]
            
        try:
            # 使用语义搜索获取相关报告
            search_results = await search_semantic_content(
                user_query,
                semantic_sections=semantic_sections,
                limit=limit * 2  # 获取更多结果以找到唯一报告
            )
        except Exception as e:
            # 如果语义搜索失败，回退到基础搜索
            print(f"语义搜索失败，回退到基础搜索: {e}")
            search_results = await search_similar_content(user_query, limit * 2)

        # 按 simulation_id 分组获取唯一报告
        unique_reports = self._group_results_by_simulation(search_results)

        # 获取完整报告内容
        historical_reports = []
        processed_count = 0

        for simulation_id, best_result in unique_reports.items():
            if processed_count >= limit:
                break

            try:
                # 获取完整报告内容
                full_content = await self._get_full_report_content(simulation_id)
                
                if full_content:
                    report_data = self._create_report_data(best_result, simulation_id, full_content)
                    historical_reports.append(report_data)
                    processed_count += 1
                else:
                    print(f"无法获取仿真 {simulation_id} 的完整内容")

            except Exception as e:
                print(f"检索仿真 {simulation_id} 完整内容时出错: {e}")
                # 可选：使用部分内容作为回退
                fallback_data = self._create_fallback_report_data(best_result, simulation_id)
                if fallback_data:
                    historical_reports.append(fallback_data)
                    processed_count += 1

        return historical_reports
    
    def _group_results_by_simulation(self, search_results) -> Dict[str, Any]:
        """按 simulation_id 分组搜索结果，保留最高相关度的结果"""
        unique_reports = {}
        for result in search_results:
            simulation_id = result.document.simulation_id
            if simulation_id not in unique_reports:
                unique_reports[simulation_id] = result
            else:
                # 保留相关度更高的结果
                if result.score > unique_reports[simulation_id].score:
                    unique_reports[simulation_id] = result
        return unique_reports
    
    async def _get_full_report_content(self, simulation_id: str) -> Optional[str]:
        """获取完整报告内容"""
        try:
            simulate_res = load_simulate_result_by_simulation_id(simulation_id)
            return simulate_res["simulation_result"]["result"]["challengeMarkdown"]
        except Exception as e:
            print(f"获取仿真 {simulation_id} 内容失败: {e}")
            return None
    
    def _create_report_data(self, best_result, simulation_id: str, full_content: str) -> Dict[str, Any]:
        """创建报告数据字典"""
        return {
            "id": best_result.document.id,
            "simulation_id": simulation_id,
            "title": best_result.document.challenge_title,
            "content": full_content,
            "content_type": "full_report",
            "semantic_section": best_result.document.semantic_section,
            "section_title": getattr(best_result.document, 'section_title', ''),
            "relevance_score": best_result.score,  # 使用正确的分数
            "distance": best_result.distance,
            "token_count": getattr(best_result.document, 'token_count', 0),
            "chunk_index": getattr(best_result.document, 'chunk_index', 0),
            "total_chunks": getattr(best_result.document, 'total_chunks', 1),
            "created_at": best_result.document.created_at,
            "metadata": getattr(best_result.document, 'metadata', {})
        }
    
    def _create_fallback_report_data(self, best_result, simulation_id: str) -> Optional[Dict[str, Any]]:
        """创建回退报告数据（使用部分内容）"""
        try:
            return {
                "id": best_result.document.id,
                "simulation_id": simulation_id,
                "title": best_result.document.challenge_title,
                "content": best_result.document.markdown_content,  # 使用部分内容
                "content_type": "partial_report",
                "semantic_section": best_result.document.semantic_section,
                "section_title": getattr(best_result.document, 'section_title', ''),
                "relevance_score": best_result.score,
                "distance": best_result.distance,
                "token_count": getattr(best_result.document, 'token_count', 0),
                "chunk_index": getattr(best_result.document, 'chunk_index', 0),
                "total_chunks": getattr(best_result.document, 'total_chunks', 1),
                "created_at": best_result.document.created_at,
                "metadata": getattr(best_result.document, 'metadata', {}),
                "is_fallback": True
            }
        except Exception:
            return None

    async def ask_question_for_report(self, user_input:str , report_content:List[str],metrics_list:List[str]=[]) -> str:
        """Ask a question about the report content and metrics"""
        ask_for_report = AskForReportModule()
        result = ask_for_report( metrics_list,report_content,user_input)
        return result.response

    async def analyze_report_content(self, reports: List[Dict[str, Any]], user_question: str) -> Dict[str, Any]:
        """Deep analysis of full report content based on user question"""

        analysis_context = {
            "key_findings": [],
            "relevant_insights": [],
            "data_points": [],
            "recommendations": [],
            "gaps_identified": [],
            "full_reports": []  # Store full report content for comprehensive analysis
        }

        for report in reports:
            content = report.get("content", "")
            content_type = report.get("content_type", "")

            # Store full report for comprehensive access
            analysis_context["full_reports"].append({
                "source_report": report["title"],
                "full_content": content,
                "simulation_id": report["simulation_id"],
                "relevance": report["relevance_score"],
                "created_at": report["created_at"]
            })

            # Extract different types of insights from full content
            if content_type == "full_report":
                # Parse full report content to extract structured insights
                extracted_insights = self._extract_insights_from_full_report(content, report["title"],
                                                                             report["relevance_score"])

                # Merge extracted insights into analysis context
                analysis_context["key_findings"].extend(extracted_insights.get("findings", []))
                analysis_context["recommendations"].extend(extracted_insights.get("recommendations", []))
                analysis_context["relevant_insights"].extend(extracted_insights.get("insights", []))
                analysis_context["data_points"].extend(extracted_insights.get("data_points", []))
            else:
                # Handle semantic section content (fallback case)
                semantic_section = report.get("semantic_section", "")
                if semantic_section == "conclusion":
                    analysis_context["key_findings"].append({
                        "source_report": report["title"],
                        "finding": content,
                        "relevance": report["relevance_score"]
                    })
                elif semantic_section == "recommendation":
                    analysis_context["recommendations"].append({
                        "source_report": report["title"],
                        "recommendation": content,
                        "relevance": report["relevance_score"]
                    })
                elif semantic_section == "analysis":
                    analysis_context["relevant_insights"].append({
                        "source_report": report["title"],
                        "insight": content,
                        "relevance": report["relevance_score"]
                    })

        return analysis_context

    def _extract_insights_from_full_report(self, content: str, report_title: str, relevance_score: float) -> Dict[
        str, List[Dict[str, Any]]]:
        """Extract structured insights from full report content"""
        insights = {
            "findings": [],
            "recommendations": [],
            "insights": [],
            "data_points": []
        }

        # Split content into sections for analysis
        lines = content.split('\n')
        current_section = ""
        current_content = []

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Detect section headers
            if line.startswith('#'):
                # Process previous section
                if current_section and current_content:
                    section_text = ' '.join(current_content)
                    self._categorize_section_content(current_section, section_text, report_title, relevance_score,
                                                     insights)

                # Start new section
                current_section = line.lower()
                current_content = []
            else:
                current_content.append(line)

        # Process last section
        if current_section and current_content:
            section_text = ' '.join(current_content)
            self._categorize_section_content(current_section, section_text, report_title, relevance_score, insights)

        return insights

    def _categorize_section_content(self, section_header: str, content: str, report_title: str, relevance_score: float,
                                    insights: Dict[str, List[Dict[str, Any]]]):
        """Categorize section content into appropriate insight types"""
        if not content.strip():
            return

        # Categorize based on section header keywords
        if any(keyword in section_header for keyword in ['conclusion', 'summary', 'finding', 'result']):
            insights["findings"].append({
                "source_report": report_title,
                "finding": content,
                "relevance": relevance_score,
                "section": section_header
            })
        elif any(keyword in section_header for keyword in ['recommendation', 'suggestion', 'action', 'next step']):
            insights["recommendations"].append({
                "source_report": report_title,
                "recommendation": content,
                "relevance": relevance_score,
                "section": section_header
            })
        elif any(keyword in section_header for keyword in ['analysis', 'insight', 'observation', 'trend']):
            insights["insights"].append({
                "source_report": report_title,
                "insight": content,
                "relevance": relevance_score,
                "section": section_header
            })
        elif any(keyword in section_header for keyword in ['data', 'metric', 'number', 'statistic', 'kpi']):
            insights["data_points"].append({
                "source_report": report_title,
                "data_point": content,
                "relevance": relevance_score,
                "section": section_header
            })
        else:
            # Default to insights for unclassified content
            insights["insights"].append({
                "source_report": report_title,
                "insight": content,
                "relevance": relevance_score,
                "section": section_header
            })

    async def generate_enhanced_analysis_report(self, reports: List[Dict[str, Any]], 
                                              user_query: str, 
                                              metrics_data: Dict[str, Any] = None) -> str:
        """生成增强的分析报告，基于完整历史报告内容
        
        Args:
            reports: 历史报告列表
            user_query: 用户查询
            metrics_data: 指标数据
        """
        report_sections = []
        
        # 添加报告头部
        report_sections.append("# 📊 智能历史分析报告")
        report_sections.append(f"**查询内容**: {user_query}")
        report_sections.append(f"**生成时间**: {self._get_current_time()}")
        report_sections.append(f"**数据来源**: {len(reports)} 个相关历史报告")
        
        if reports:
            # 按语义段落类型组织发现
            semantic_findings = self._organize_reports_by_semantic_type(reports)
            
            # 执行摘要
            if 'executive_summary' in semantic_findings:
                report_sections.append("\n## 🎯 执行摘要")
                for report in semantic_findings['executive_summary'][:2]:
                    report_sections.append(f"### {report['title']}")
                    report_sections.append(f"**相关度**: {report['relevance_score']:.3f}")
                    report_sections.append(f"**摘要**: {self._extract_summary(report['content'])}")
                    report_sections.append("")
            
            # 关键结论
            if 'conclusion' in semantic_findings:
                report_sections.append("\n## 📋 关键结论")
                for report in semantic_findings['conclusion'][:3]:
                    report_sections.append(f"### {report['title']}")
                    report_sections.append(f"**相关度**: {report['relevance_score']:.3f}")
                    conclusions = self._extract_conclusions(report['content'])
                    for conclusion in conclusions[:2]:
                        report_sections.append(f"- {conclusion}")
                    report_sections.append("")
            
            # 推荐行动
            if 'recommendation' in semantic_findings:
                report_sections.append("\n## 💡 推荐行动")
                for report in semantic_findings['recommendation'][:3]:
                    report_sections.append(f"### {report['title']}")
                    priority = self._calculate_priority(report['relevance_score'])
                    report_sections.append(f"**优先级**: {priority}")
                    recommendations = self._extract_recommendations(report['content'])
                    for rec in recommendations[:2]:
                        report_sections.append(f"- {rec}")
                    report_sections.append("")
            
            # 其他相关分析
            other_sections = {k: v for k, v in semantic_findings.items() 
                            if k not in ['executive_summary', 'conclusion', 'recommendation']}
            if other_sections:
                report_sections.append("\n## 📈 补充分析")
                for section_type, reports_list in other_sections.items():
                    section_name = self._get_section_display_name(section_type)
                    report_sections.append(f"### {section_name}")
                    for report in reports_list[:2]:
                        summary = self._extract_summary(report['content'])
                        report_sections.append(f"- **{report['title']}**: {summary}")
                    report_sections.append("")
        
        # 数据洞察
        # if metrics_data:
        #     report_sections.append("\n## 📊 当前数据洞察")
        #     for key, value in metrics_data.items():
        #         if isinstance(value, dict) and 'trend' in value:
        #             trend_indicator = "📈" if value.get('trend', 0) > 0 else "📉" if value.get('trend', 0) < 0 else "➡️"
        #             report_sections.append(f"- **{key}**: {value.get('current', 'N/A')} {trend_indicator}")
        #         else:
        #             report_sections.append(f"- **{key}**: {value}")
        
        # 智能建议
        report_sections.append("\n## 🚀 智能建议")
        suggestions = self._generate_intelligent_suggestions(reports, metrics_data)
        for suggestion in suggestions:
            report_sections.append(f"- {suggestion}")
        
        # 相关报告索引
        if reports:
            report_sections.append("\n## 📚 相关报告索引")
            for i, report in enumerate(reports[:5], 1):
                fallback_indicator = " (部分内容)" if report.get('is_fallback') else ""
                report_sections.append(
                    f"{i}. **{report['title']}**{fallback_indicator} "
                    f"(相关度: {report['relevance_score']:.3f}, "
                    f"类型: {report['content_type']}, "
                    f"语义段落: {report.get('semantic_section', 'general')})"
                )
        
        return "\n".join(report_sections)
    
    def _organize_reports_by_semantic_type(self, reports: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """按语义段落类型组织报告"""
        organized = {}
        for report in reports:
            semantic_section = report.get('semantic_section', 'general')
            if semantic_section not in organized:
                organized[semantic_section] = []
            organized[semantic_section].append(report)
        
        # 按相关度排序每个类型的结果
        for section_type in organized:
            organized[section_type].sort(key=lambda x: x.get('relevance_score', 0), reverse=True)
        
        return organized
    
    def _extract_summary(self, content: str, max_length: int = 200) -> str:
        """从内容中提取摘要"""
        if not content:
            return "无可用摘要"
        
        # 简单的摘要提取：取前几句话
        sentences = content.split('。')
        summary = ""
        for sentence in sentences:
            if len(summary + sentence) <= max_length:
                summary += sentence + "。"
            else:
                break
        
        return summary.strip() or content[:max_length] + "..."
    
    def _extract_conclusions(self, content: str) -> List[str]:
        """从内容中提取结论"""
        conclusions = []
        lines = content.split('\n')
        
        for line in lines:
            line = line.strip()
            if any(keyword in line.lower() for keyword in ['结论', 'conclusion', '总结', '发现']):
                if len(line) > 10:  # 过滤太短的行
                    conclusions.append(line)
        
        return conclusions[:5]  # 最多返回5个结论
    
    def _extract_recommendations(self, content: str) -> List[str]:
        """从内容中提取推荐"""
        recommendations = []
        lines = content.split('\n')
        
        for line in lines:
            line = line.strip()
            if any(keyword in line.lower() for keyword in ['建议', 'recommendation', '推荐', '应该']):
                if len(line) > 10:  # 过滤太短的行
                    recommendations.append(line)
        
        return recommendations[:5]  # 最多返回5个推荐
    
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
    
    def _generate_intelligent_suggestions(self, reports: List[Dict[str, Any]], 
                                        metrics_data: Dict[str, Any] = None) -> List[str]:
        """基于报告和指标数据生成智能建议"""
        suggestions = []
        
        # 基于报告数量的建议
        if len(reports) == 0:
            suggestions.append("建议扩展搜索范围或调整查询关键词以获取更多相关历史案例")
        elif len(reports) < 3:
            suggestions.append("相关历史案例较少，建议结合实时数据进行深入分析")
        
        # 基于语义段落分布的建议
        semantic_types = set(report.get('semantic_section', 'general') for report in reports)
        if 'recommendation' not in semantic_types:
            suggestions.append("缺少具体的行动建议，建议查找更多包含推荐措施的历史案例")
        if 'conclusion' not in semantic_types:
            suggestions.append("建议补充结论分析以更好地理解问题的解决方案")
        
        # 基于回退数据的建议
        fallback_count = sum(1 for report in reports if report.get('is_fallback'))
        if fallback_count > 0:
            suggestions.append(f"有 {fallback_count} 个报告使用了部分内容，建议检查数据完整性")
        
        # 基于指标数据的建议
        # if metrics_data:
        #     trending_down = any(
        #         isinstance(v, dict) and v.get('trend', 0) < 0
        #         for v in metrics_data.values()
        #     )
        #     if trending_down:
        #         suggestions.append("检测到下降趋势，建议优先关注风险控制和改进措施")
        
        # 基于报告质量的建议
        # high_quality_reports = [r for r in reports if r.get('relevance_score', 0) > 0.7]
        # if len(high_quality_reports) < len(reports) * 0.5:
        #     suggestions.append("部分匹配报告相关度较低，建议细化查询条件或扩展搜索范围")
        #
        # # 默认建议
        # if not suggestions:
        #     suggestions.extend([
        #         "建议结合多个维度的历史数据进行综合分析",
        #         "关注趋势变化和异常指标，及时调整策略",
        #         "定期回顾和更新分析模型以提高准确性"
        #     ])
        
        return suggestions[:5]  # 限制建议数量
    
    def _get_current_time(self) -> str:
        """获取当前时间的格式化字符串"""
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    async def generate_conversation_response(self, analysis_context: Dict[str, Any],
                                             user_question: str, metrics_data: Dict[str, Any] = None) -> str:
        """生成对话式响应（保持向后兼容）"""
        # 为了向后兼容，保留原有方法但使用新的增强功能
        reports = analysis_context.get("full_reports", [])
        
        # 转换格式以适配新方法
        formatted_reports = []
        for report in reports:
            formatted_report = {
                "title": report.get("source_report", "未知报告"),
                "content": report.get("full_content", ""),
                "relevance_score": report.get("relevance", 0.0),
                "simulation_id": report.get("simulation_id", ""),
                "content_type": "full_report",
                "semantic_section": "general",
                "created_at": report.get("created_at", "")
            }
            formatted_reports.append(formatted_report)
        
        return await self.generate_enhanced_analysis_report(formatted_reports, user_question, metrics_data)
