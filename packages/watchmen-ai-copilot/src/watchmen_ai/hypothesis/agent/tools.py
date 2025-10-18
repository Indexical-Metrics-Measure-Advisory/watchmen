from typing import Dict, Any, List, Optional
from abc import ABC, abstractmethod
import json
from datetime import datetime, timedelta

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

from watchmen_utilities import ExtendedBaseModel


class MetricQueryInput(BaseModel):
    """指标查询输入"""
    metric_names: List[str] = Field(description="要查询的指标名称列表")
    time_range: Optional[str] = Field(default=None, description="时间范围，如'last_30_days'")
    filters: Optional[Dict[str, Any]] = Field(default=None, description="过滤条件")


class ReportGenerationInput(BaseModel):
    """报表生成输入"""
    title: str = Field(description="报表标题")
    metrics: List[str] = Field(description="包含的指标")
    chart_types: Optional[List[str]] = Field(default=None, description="图表类型")
    template: Optional[str] = Field(default=None, description="报表模板")


class DataExplorationInput(BaseModel):
    """数据探索输入"""
    dataset: str = Field(description="数据集名称")
    dimensions: List[str] = Field(description="分析维度")
    analysis_type: str = Field(description="分析类型：correlation, trend, anomaly")


class MetricQueryTool(BaseTool):
    """指标查询工具"""
    name = "metric_query"
    description = "查询业务指标数据，支持多种指标和时间范围"
    args_schema = MetricQueryInput
    
    def _run(self, metric_names: List[str], time_range: Optional[str] = None, 
             filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """执行指标查询"""
        # 模拟指标数据
        mock_data = {
            "sales_revenue": {
                "current_value": 1250000,
                "previous_value": 1100000,
                "change_rate": 0.136,
                "trend": "increasing",
                "unit": "CNY",
                "time_series": self._generate_time_series(1250000, time_range)
            },
            "user_count": {
                "current_value": 8500,
                "previous_value": 8300,
                "change_rate": 0.024,
                "trend": "stable",
                "unit": "count",
                "time_series": self._generate_time_series(8500, time_range)
            },
            "conversion_rate": {
                "current_value": 0.125,
                "previous_value": 0.132,
                "change_rate": -0.053,
                "trend": "decreasing",
                "unit": "percentage",
                "time_series": self._generate_time_series(0.125, time_range)
            },
            "customer_acquisition_cost": {
                "current_value": 150,
                "previous_value": 145,
                "change_rate": 0.034,
                "trend": "increasing",
                "unit": "CNY",
                "time_series": self._generate_time_series(150, time_range)
            }
        }
        
        result = {}
        for metric_name in metric_names:
            if metric_name in mock_data:
                result[metric_name] = mock_data[metric_name]
                
                # 应用过滤条件
                if filters:
                    result[metric_name] = self._apply_filters(result[metric_name], filters)
        
        return {
            "success": True,
            "data": result,
            "query_time": datetime.now().isoformat(),
            "time_range": time_range or "current"
        }
    
    def _generate_time_series(self, current_value: float, time_range: Optional[str]) -> List[Dict[str, Any]]:
        """生成时间序列数据"""
        if not time_range:
            return []
        
        days = 30 if time_range == "last_30_days" else 7
        time_series = []
        
        for i in range(days):
            date = datetime.now() - timedelta(days=days-i-1)
            # 添加一些随机变化
            variation = 0.9 + (i % 3) * 0.05
            value = current_value * variation
            
            time_series.append({
                "date": date.strftime("%Y-%m-%d"),
                "value": round(value, 2)
            })
        
        return time_series
    
    def _apply_filters(self, data: Dict[str, Any], filters: Dict[str, Any]) -> Dict[str, Any]:
        """应用过滤条件"""
        # 简单的过滤逻辑示例
        filtered_data = data.copy()
        
        if "min_value" in filters:
            if data["current_value"] < filters["min_value"]:
                filtered_data["filtered"] = True
        
        return filtered_data


class ReportGenerationTool(BaseTool):
    """报表生成工具"""
    name = "report_generation"
    description = "生成业务报表，支持多种图表类型和模板"
    args_schema = ReportGenerationInput
    
    def _run(self, title: str, metrics: List[str], 
             chart_types: Optional[List[str]] = None,
             template: Optional[str] = None) -> Dict[str, Any]:
        """执行报表生成"""
        
        # 默认图表类型
        if not chart_types:
            chart_types = ["line", "bar", "pie"]
        
        # 生成报表结构
        report = {
            "id": f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "title": title,
            "created_at": datetime.now().isoformat(),
            "template": template or "default",
            "sections": [
                {
                    "id": "summary",
                    "type": "text",
                    "title": "执行摘要",
                    "content": self._generate_summary(metrics)
                },
                {
                    "id": "metrics_overview",
                    "type": "metrics",
                    "title": "指标概览",
                    "content": self._generate_metrics_overview(metrics)
                },
                {
                    "id": "charts",
                    "type": "visualization",
                    "title": "数据可视化",
                    "content": self._generate_charts(metrics, chart_types)
                },
                {
                    "id": "insights",
                    "type": "text",
                    "title": "关键洞察",
                    "content": self._generate_insights(metrics)
                }
            ],
            "metadata": {
                "metrics_count": len(metrics),
                "chart_count": len(chart_types),
                "generation_method": "ai_agent"
            }
        }
        
        return {
            "success": True,
            "report": report,
            "download_url": f"/api/reports/{report['id']}/download",
            "preview_url": f"/api/reports/{report['id']}/preview"
        }
    
    def _generate_summary(self, metrics: List[str]) -> str:
        """生成执行摘要"""
        return f"本报表分析了{len(metrics)}个关键业务指标，包括{', '.join(metrics[:3])}等。" + \
               "通过数据分析发现了重要的业务趋势和改进机会。"
    
    def _generate_metrics_overview(self, metrics: List[str]) -> List[Dict[str, Any]]:
        """生成指标概览"""
        overview = []
        for metric in metrics:
            overview.append({
                "name": metric,
                "current_value": f"{1000 + hash(metric) % 9000}",
                "trend": "increasing" if hash(metric) % 2 else "decreasing",
                "status": "good" if hash(metric) % 3 else "warning"
            })
        return overview
    
    def _generate_charts(self, metrics: List[str], chart_types: List[str]) -> List[Dict[str, Any]]:
        """生成图表配置"""
        charts = []
        for i, metric in enumerate(metrics):
            chart_type = chart_types[i % len(chart_types)]
            charts.append({
                "id": f"chart_{i+1}",
                "type": chart_type,
                "title": f"{metric} 趋势图",
                "metric": metric,
                "config": {
                    "width": 600,
                    "height": 400,
                    "responsive": True
                }
            })
        return charts
    
    def _generate_insights(self, metrics: List[str]) -> str:
        """生成关键洞察"""
        insights = [
            "数据显示业务整体呈现稳定增长趋势",
            "部分指标存在季节性波动，需要持续关注",
            "建议加强数据驱动的决策制定"
        ]
        return "\n".join([f"• {insight}" for insight in insights])


class DataExplorationTool(BaseTool):
    """数据探索工具"""
    name = "data_exploration"
    description = "探索数据集，发现模式、趋势和异常"
    args_schema = DataExplorationInput
    
    def _run(self, dataset: str, dimensions: List[str], analysis_type: str) -> Dict[str, Any]:
        """执行数据探索"""
        
        exploration_results = {
            "dataset": dataset,
            "dimensions": dimensions,
            "analysis_type": analysis_type,
            "results": self._perform_analysis(dataset, dimensions, analysis_type),
            "insights": self._generate_exploration_insights(analysis_type),
            "recommendations": self._generate_recommendations(analysis_type)
        }
        
        return {
            "success": True,
            "exploration": exploration_results,
            "execution_time": datetime.now().isoformat()
        }
    
    def _perform_analysis(self, dataset: str, dimensions: List[str], analysis_type: str) -> Dict[str, Any]:
        """执行具体的分析"""
        if analysis_type == "correlation":
            return self._correlation_analysis(dimensions)
        elif analysis_type == "trend":
            return self._trend_analysis(dimensions)
        elif analysis_type == "anomaly":
            return self._anomaly_detection(dimensions)
        else:
            return {"error": f"Unsupported analysis type: {analysis_type}"}
    
    def _correlation_analysis(self, dimensions: List[str]) -> Dict[str, Any]:
        """相关性分析"""
        correlations = []
        for i, dim1 in enumerate(dimensions):
            for dim2 in dimensions[i+1:]:
                correlation = 0.3 + (hash(dim1 + dim2) % 70) / 100  # 模拟相关系数
                correlations.append({
                    "dimension1": dim1,
                    "dimension2": dim2,
                    "correlation": round(correlation, 3),
                    "strength": "strong" if correlation > 0.7 else "moderate" if correlation > 0.4 else "weak"
                })
        
        return {
            "type": "correlation",
            "correlations": correlations,
            "summary": f"发现{len(correlations)}个维度间的相关关系"
        }
    
    def _trend_analysis(self, dimensions: List[str]) -> Dict[str, Any]:
        """趋势分析"""
        trends = []
        for dim in dimensions:
            trend_direction = "increasing" if hash(dim) % 2 else "decreasing"
            trend_strength = 0.1 + (hash(dim) % 50) / 100
            
            trends.append({
                "dimension": dim,
                "direction": trend_direction,
                "strength": round(trend_strength, 3),
                "confidence": 0.8 + (hash(dim) % 20) / 100
            })
        
        return {
            "type": "trend",
            "trends": trends,
            "summary": f"分析了{len(dimensions)}个维度的趋势变化"
        }
    
    def _anomaly_detection(self, dimensions: List[str]) -> Dict[str, Any]:
        """异常检测"""
        anomalies = []
        for dim in dimensions:
            if hash(dim) % 3 == 0:  # 模拟部分维度有异常
                anomalies.append({
                    "dimension": dim,
                    "anomaly_score": 0.7 + (hash(dim) % 30) / 100,
                    "anomaly_type": "outlier",
                    "description": f"{dim}维度检测到异常值"
                })
        
        return {
            "type": "anomaly",
            "anomalies": anomalies,
            "total_anomalies": len(anomalies),
            "summary": f"在{len(dimensions)}个维度中检测到{len(anomalies)}个异常"
        }
    
    def _generate_exploration_insights(self, analysis_type: str) -> List[str]:
        """生成探索洞察"""
        insights_map = {
            "correlation": [
                "发现了多个维度间的强相关关系",
                "相关性分析有助于理解业务驱动因素",
                "建议进一步验证因果关系"
            ],
            "trend": [
                "识别出明显的趋势模式",
                "趋势分析揭示了业务发展方向",
                "建议制定相应的策略调整"
            ],
            "anomaly": [
                "检测到需要关注的异常点",
                "异常可能指示潜在的问题或机会",
                "建议深入调查异常原因"
            ]
        }
        
        return insights_map.get(analysis_type, ["完成了数据探索分析"])
    
    def _generate_recommendations(self, analysis_type: str) -> List[str]:
        """生成建议"""
        recommendations_map = {
            "correlation": [
                "利用强相关关系优化业务决策",
                "监控关键相关指标的变化",
                "建立预测模型基于相关性"
            ],
            "trend": [
                "根据趋势调整业务策略",
                "设置趋势监控和预警机制",
                "制定长期发展规划"
            ],
            "anomaly": [
                "调查异常的根本原因",
                "建立异常监控系统",
                "制定异常处理流程"
            ]
        }
        
        return recommendations_map.get(analysis_type, ["继续深入分析数据"])


class KnowledgeSearchTool(BaseTool):
    """知识库搜索工具"""
    name = "knowledge_search"
    description = "搜索知识库中的相关文档和信息"
    
    def _run(self, query: str, limit: int = 5) -> Dict[str, Any]:
        """执行知识库搜索"""
        # 模拟知识库搜索结果
        mock_results = [
            {
                "id": "kb_001",
                "title": "业务指标分析最佳实践",
                "content": "业务指标分析应该遵循SMART原则，确保指标具体、可衡量、可达成、相关性强、有时限...",
                "relevance_score": 0.95,
                "source": "best_practices",
                "tags": ["指标", "分析", "最佳实践"]
            },
            {
                "id": "kb_002",
                "title": "数据可视化设计指南",
                "content": "有效的数据可视化应该清晰传达信息，选择合适的图表类型，注意颜色搭配和布局...",
                "relevance_score": 0.88,
                "source": "design_guide",
                "tags": ["可视化", "设计", "图表"]
            },
            {
                "id": "kb_003",
                "title": "报表自动化流程",
                "content": "自动化报表生成可以提高效率，减少人工错误，确保数据的及时性和准确性...",
                "relevance_score": 0.82,
                "source": "automation",
                "tags": ["报表", "自动化", "流程"]
            }
        ]
        
        # 根据查询过滤和排序结果
        filtered_results = [r for r in mock_results if r["relevance_score"] > 0.7]
        sorted_results = sorted(filtered_results, key=lambda x: x["relevance_score"], reverse=True)
        
        return {
            "success": True,
            "query": query,
            "results": sorted_results[:limit],
            "total_found": len(sorted_results),
            "search_time": datetime.now().isoformat()
        }


# 工具注册表
AVAILABLE_TOOLS = {
    "metric_query": MetricQueryTool(),
    "report_generation": ReportGenerationTool(),
    "data_exploration": DataExplorationTool(),
    "knowledge_search": KnowledgeSearchTool()
}


def get_tool(tool_name: str) -> Optional[BaseTool]:
    """获取指定的工具"""
    return AVAILABLE_TOOLS.get(tool_name)


def get_all_tools() -> List[BaseTool]:
    """获取所有可用工具"""
    return list(AVAILABLE_TOOLS.values())


def get_tools_by_intent(intent: str) -> List[BaseTool]:
    """根据意图获取相关工具"""
    intent_tool_mapping = {
        "business_analysis": ["metric_query", "knowledge_search", "data_exploration"],
        "metric_query": ["metric_query"],
        "report_generation": ["report_generation", "metric_query"],
        "data_exploration": ["data_exploration", "metric_query"],
        "hypothesis_testing": ["data_exploration", "metric_query", "knowledge_search"]
    }
    
    tool_names = intent_tool_mapping.get(intent, [])
    return [AVAILABLE_TOOLS[name] for name in tool_names if name in AVAILABLE_TOOLS]