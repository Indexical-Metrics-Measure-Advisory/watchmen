from datetime import datetime
from typing import List, Dict, Any

from watchmen_utilities import ExtendedBaseModel


class NewAnalysisGenerator(ExtendedBaseModel):
    """Generator for new analysis reports based on historical context"""

    def __init__(self):
        super().__init__()

    async def generate_new_analysis(self, user_request: str, historical_context: Dict[str, Any],
                                    metrics_data: Dict[str, Any], conversation_insights: List[str]) -> Dict[str, Any]:
        """Generate new analysis report combining all available information"""

        # Create comprehensive analysis report
        new_report = {
            "id": f"analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "title": await self._generate_title(user_request),
            "created_at": datetime.now().isoformat(),
            "request": user_request,
            "sections": {
                "executive_summary": await self._generate_executive_summary(
                    user_request, historical_context, metrics_data
                ),
                "historical_insights": await self._synthesize_historical_insights(historical_context),
                "current_metrics_analysis": await self._analyze_current_metrics(metrics_data),
                "conversation_insights": conversation_insights,
                "recommendations": await self._generate_recommendations(
                    historical_context, metrics_data, conversation_insights
                ),
                "future_actions": await self._suggest_future_actions(
                    user_request, historical_context, metrics_data
                )
            },
            "metadata": {
                "generation_method": "conversational_ai_agent",
                "data_sources": ["historical_reports", "mcp_metrics", "conversation_context"],
                "historical_reports_count": len(historical_context.get("key_findings", [])),
                "metrics_analyzed": list(metrics_data.keys()) if metrics_data else []
            }
        }

        return new_report

    async def _generate_title(self, user_request: str) -> str:
        """Generate appropriate title for the analysis"""
        if len(user_request) > 60:
            return f"深度分析：{user_request[:57]}..."
        return f"深度分析：{user_request}"

    async def _generate_executive_summary(self, user_request: str,
                                          historical_context: Dict[str, Any],
                                          metrics_data: Dict[str, Any]) -> str:
        """Generate executive summary"""
        summary_parts = [
            f"本分析基于用户需求：{user_request}",
            f"综合了{len(historical_context.get('key_findings', []))}个历史分析报告的洞察",
            f"结合了{len(metrics_data)}个当前关键指标的数据"
        ]

        if historical_context.get("key_findings"):
            summary_parts.append("历史分析显示了重要的业务趋势和模式")

        if metrics_data:
            summary_parts.append("当前指标数据为分析提供了实时的业务状况")

        return "。".join(summary_parts) + "。"

    async def _synthesize_historical_insights(self, historical_context: Dict[str, Any]) -> List[str]:
        """Synthesize insights from historical reports"""
        insights = []

        for finding in historical_context.get("key_findings", []):
            insights.append(f"来自{finding['source_report']}：{finding['finding']}")

        for rec in historical_context.get("recommendations", []):
            insights.append(f"历史建议（{rec['source_report']}）：{rec['recommendation']}")

        return insights

    async def _analyze_current_metrics(self, metrics_data: Dict[str, Any]) -> List[str]:
        """Analyze current metrics data"""
        analysis = []

        for metric_name, metric_info in metrics_data.items():
            trend = metric_info.get("trend", "stable")
            change_rate = metric_info.get("change_rate", 0)

            if trend == "increasing" and change_rate > 0.1:
                analysis.append(f"{metric_name}显示强劲增长趋势，增长率为{change_rate:.1%}")
            elif trend == "decreasing" and change_rate < -0.1:
                analysis.append(f"{metric_name}出现显著下降，下降率为{abs(change_rate):.1%}")
            else:
                analysis.append(f"{metric_name}保持相对稳定，当前值为{metric_info.get('value')}")

        return analysis

    async def _generate_recommendations(self, historical_context: Dict[str, Any],
                                        metrics_data: Dict[str, Any],
                                        conversation_insights: List[str]) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = [
            "基于历史分析和当前数据，建议采取以下行动："
        ]

        # Add data-driven recommendations
        for metric_name, metric_info in metrics_data.items():
            if metric_info.get("trend") == "decreasing":
                recommendations.append(f"针对{metric_name}的下降趋势，需要制定改进策略")

        # Add historical insights
        for rec in historical_context.get("recommendations", [])[:2]:
            recommendations.append(f"参考历史经验：{rec['recommendation']}")

        return recommendations

    async def _suggest_future_actions(self, user_request: str,
                                      historical_context: Dict[str, Any],
                                      metrics_data: Dict[str, Any]) -> List[str]:
        """Suggest future actions"""
        actions = [
            "建议的后续行动：",
            "1. 持续监控关键指标的变化趋势",
            "2. 定期回顾和更新分析结果",
            "3. 基于新数据调整策略方向"
        ]

        if len(historical_context.get("key_findings", [])) > 0:
            actions.append("4. 深入研究历史成功案例的可复制性")

        return actions
