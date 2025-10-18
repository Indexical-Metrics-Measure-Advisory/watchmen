from typing import Dict, Any, List, Optional, TypedDict, Literal
import uuid
import json
from datetime import datetime, timedelta
from enum import Enum

from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_core.pydantic_v1 import BaseModel, Field
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END

from watchmen_ai.hypothesis.agent.actions.mcp_metric_connector import MCPConnector
from watchmen_utilities import ExtendedBaseModel


class MetricImportance(Enum):
    """Metric importance levels"""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ChartType(Enum):
    """Chart types for visualization"""
    LINE = "line"
    BAR = "bar"
    PIE = "pie"
    SCATTER = "scatter"
    HEATMAP = "heatmap"


class MetricQuery(BaseModel):
    """Metric query structure"""
    metric_names: List[str] = Field(description="List of metric names to query")
    dimensions: List[str] = Field(description="Dimensions to group by")
    time_range: Dict[str, str] = Field(description="Time range with start and end dates")
    filters: Optional[Dict[str, Any]] = Field(default=None, description="Additional filters")


class ChartData(BaseModel):
    """Chart data structure"""
    chart_type: ChartType
    title: str
    data: List[Dict[str, Any]]
    x_axis: str
    y_axis: str
    config: Optional[Dict[str, Any]] = None


class TableData(BaseModel):
    """Table data structure"""
    headers: List[str]
    rows: List[List[Any]]
    title: str
    summary: Optional[str] = None


class ImportanceAnalysis(BaseModel):
    """Importance analysis structure"""
    metric_name: str
    importance_level: MetricImportance
    reasoning: str
    impact_score: float  # 0-1 scale
    trend_analysis: str
    anomalies: List[str]


class DrillDownSuggestion(BaseModel):
    """Drill-down suggestion structure"""
    suggested_dimensions: List[str]
    reasoning: str
    priority: int  # 1-5 scale
    expected_insights: List[str]


class MetricAgentState(TypedDict):
    """Metric agent state definition"""
    messages: List[BaseMessage]
    user_input: str
    metric_query: Optional[MetricQuery]
    raw_data: Dict[str, Any]
    chart_data: List[ChartData]
    table_data: List[TableData]
    importance_analysis: List[ImportanceAnalysis]
    drill_down_suggestions: List[DrillDownSuggestion]
    session_id: str
    user_id: str
    tenant_id: str
    error: Optional[str]
    stage: str  # query_parsing, data_fetching, analysis, response_generation


class MetricAgent(ExtendedBaseModel):
    """Metric analysis agent for querying metrics and providing insights"""

    def __init__(self, session_id: str = None):
        super().__init__()
        self.session_id = session_id or str(uuid.uuid4())
        self.mcp_connector = MCPConnector()
        self.llm = ChatOpenAI(model="gpt-4o", temperature=0)
        self.workflow = self._build_workflow()

    def _build_workflow(self) -> StateGraph:
        """Build the metric agent workflow"""
        workflow = StateGraph(MetricAgentState)

        # Add nodes
        workflow.add_node("query_parsing", self._parse_query_node)
        workflow.add_node("metric_confirmation", self._confirm_metrics_node)
        workflow.add_node("data_fetching", self._fetch_data_node)
        workflow.add_node("data_analysis", self._analyze_data_node)
        workflow.add_node("visualization", self._create_visualizations_node)
        workflow.add_node("importance_analysis", self._analyze_importance_node)
        workflow.add_node("drill_down_suggestions", self._generate_suggestions_node)
        workflow.add_node("response_generation", self._generate_response_node)

        # Set entry point
        workflow.set_entry_point("query_parsing")

        # Add edges
        workflow.add_edge("query_parsing", "metric_confirmation")
        workflow.add_edge("metric_confirmation", "data_fetching")
        workflow.add_edge("data_fetching", "data_analysis")
        workflow.add_edge("data_analysis", "visualization")
        workflow.add_edge("visualization", "importance_analysis")
        workflow.add_edge("importance_analysis", "drill_down_suggestions")
        workflow.add_edge("drill_down_suggestions", "response_generation")
        workflow.add_edge("response_generation", END)

        return workflow

    async def _parse_query_node(self, state: MetricAgentState) -> MetricAgentState:
        """Parse user query to extract metric requirements"""
        try:
            user_input = state["user_input"]
            
            # Use LLM to parse the query
            system_prompt = """
            You are a metric query parser. Extract the following information from user input:
            1. Metric names (e.g., sales_revenue, user_count, conversion_rate)
            2. Dimensions (e.g., region, product_category, user_segment)
            3. Time range (start_date, end_date)
            4. Any additional filters
            
            Return the result as a JSON object with the structure:
            {
                "metric_names": ["metric1", "metric2"],
                "dimensions": ["dimension1", "dimension2"],
                "time_range": {"start_date": "2024-01-01", "end_date": "2024-01-31"},
                "filters": {"key": "value"}
            }
            """
            
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_input)
            ]
            
            response = await self.llm.ainvoke(messages)
            
            try:
                parsed_data = json.loads(response.content)
                metric_query = MetricQuery(**parsed_data)
                state["metric_query"] = metric_query
                state["stage"] = "metric_confirmation"
            except (json.JSONDecodeError, ValueError) as e:
                # Fallback to default query
                state["metric_query"] = MetricQuery(
                    metric_names=["sales_revenue", "user_count"],
                    dimensions=["date"],
                    time_range={"start_date": "2024-01-01", "end_date": "2024-01-31"}
                )
                state["stage"] = "metric_confirmation"
                
        except Exception as e:
            state["error"] = f"Query parsing failed: {str(e)}"
            
        return state

    async def _confirm_metrics_node(self, state: MetricAgentState) -> MetricAgentState:
        """Confirm metrics and dimensions with available data"""
        try:
            available_metrics = await self.mcp_connector.get_available_metrics()
            metric_query = state["metric_query"]
            
            # Filter metrics to only include available ones
            confirmed_metrics = [m for m in metric_query.metric_names if m in available_metrics]
            
            if not confirmed_metrics:
                # Use default metrics if none are available
                confirmed_metrics = available_metrics[:3]
                
            # Update metric query with confirmed metrics
            metric_query.metric_names = confirmed_metrics
            state["metric_query"] = metric_query
            state["stage"] = "data_fetching"
            
        except Exception as e:
            state["error"] = f"Metric confirmation failed: {str(e)}"
            
        return state

    async def _fetch_data_node(self, state: MetricAgentState) -> MetricAgentState:
        """Fetch metric data from MCP connector"""
        try:
            metric_query = state["metric_query"]
            
            # Fetch data from MCP
            raw_data = await self.mcp_connector.fetch_metrics(
                metric_names=metric_query.metric_names,
                filters=metric_query.filters
            )
            
            state["raw_data"] = raw_data
            state["stage"] = "data_analysis"
            
        except Exception as e:
            state["error"] = f"Data fetching failed: {str(e)}"
            
        return state

    async def _analyze_data_node(self, state: MetricAgentState) -> MetricAgentState:
        """Analyze the fetched data"""
        try:
            raw_data = state["raw_data"]
            
            # Perform basic data analysis
            analyzed_data = {}
            for metric_name, metric_data in raw_data.items():
                analyzed_data[metric_name] = {
                    **metric_data,
                    "analysis": {
                        "trend_direction": metric_data.get("trend", "unknown"),
                        "change_rate": metric_data.get("change_rate", 0),
                        "volatility": abs(metric_data.get("change_rate", 0)),
                        "performance": self._evaluate_performance(metric_data)
                    }
                }
            
            state["raw_data"] = analyzed_data
            state["stage"] = "visualization"
            
        except Exception as e:
            state["error"] = f"Data analysis failed: {str(e)}"
            
        return state

    async def _create_visualizations_node(self, state: MetricAgentState) -> MetricAgentState:
        """Create chart and table visualizations"""
        try:
            raw_data = state["raw_data"]
            metric_query = state["metric_query"]
            
            charts = []
            tables = []
            
            # Create charts for each metric
            for metric_name, metric_data in raw_data.items():
                # Line chart for trend
                chart_data = ChartData(
                    chart_type=ChartType.LINE,
                    title=f"{metric_name.replace('_', ' ').title()} Trend",
                    data=[
                        {"x": metric_data.get("period", "2024-01"), "y": metric_data.get("value", 0)}
                    ],
                    x_axis="Time",
                    y_axis=metric_data.get("unit", "Value")
                )
                charts.append(chart_data)
            
            # Create summary table
            headers = ["Metric", "Current Value", "Unit", "Trend", "Change Rate"]
            rows = []
            for metric_name, metric_data in raw_data.items():
                rows.append([
                    metric_name.replace('_', ' ').title(),
                    metric_data.get("value", 0),
                    metric_data.get("unit", ""),
                    metric_data.get("trend", "unknown"),
                    f"{metric_data.get('change_rate', 0):.2%}"
                ])
            
            table_data = TableData(
                headers=headers,
                rows=rows,
                title="Metrics Summary",
                summary=f"Summary of {len(raw_data)} metrics for the requested period"
            )
            tables.append(table_data)
            
            state["chart_data"] = charts
            state["table_data"] = tables
            state["stage"] = "importance_analysis"
            
        except Exception as e:
            state["error"] = f"Visualization creation failed: {str(e)}"
            
        return state

    async def _analyze_importance_node(self, state: MetricAgentState) -> MetricAgentState:
        """Analyze the importance of each metric"""
        try:
            raw_data = state["raw_data"]
            importance_analyses = []
            
            for metric_name, metric_data in raw_data.items():
                # Calculate importance based on change rate and trend
                change_rate = abs(metric_data.get("change_rate", 0))
                trend = metric_data.get("trend", "stable")
                
                # Determine importance level
                if change_rate > 0.1 or trend in ["increasing", "decreasing"]:
                    importance_level = MetricImportance.HIGH
                    impact_score = min(0.9, 0.5 + change_rate)
                elif change_rate > 0.05:
                    importance_level = MetricImportance.MEDIUM
                    impact_score = 0.3 + change_rate
                else:
                    importance_level = MetricImportance.LOW
                    impact_score = 0.1 + change_rate
                
                # Generate reasoning
                reasoning = self._generate_importance_reasoning(metric_name, metric_data)
                
                # Detect anomalies
                anomalies = self._detect_anomalies(metric_data)
                
                analysis = ImportanceAnalysis(
                    metric_name=metric_name,
                    importance_level=importance_level,
                    reasoning=reasoning,
                    impact_score=impact_score,
                    trend_analysis=f"Trend: {trend}, Change rate: {change_rate:.2%}",
                    anomalies=anomalies
                )
                importance_analyses.append(analysis)
            
            state["importance_analysis"] = importance_analyses
            state["stage"] = "drill_down_suggestions"
            
        except Exception as e:
            state["error"] = f"Importance analysis failed: {str(e)}"
            
        return state

    async def _generate_suggestions_node(self, state: MetricAgentState) -> MetricAgentState:
        """Generate drill-down suggestions"""
        try:
            importance_analyses = state["importance_analysis"]
            metric_query = state["metric_query"]
            suggestions = []
            
            for analysis in importance_analyses:
                if analysis.importance_level == MetricImportance.HIGH:
                    # High importance metrics need detailed drill-down
                    suggestion = DrillDownSuggestion(
                        suggested_dimensions=["region", "product_category", "user_segment"],
                        reasoning=f"High importance metric {analysis.metric_name} shows significant changes. Drill down by dimensions to identify root causes.",
                        priority=1,
                        expected_insights=[
                            f"Identify which regions/segments drive {analysis.metric_name} changes",
                            "Discover performance patterns across different categories",
                            "Uncover potential optimization opportunities"
                        ]
                    )
                elif analysis.importance_level == MetricImportance.MEDIUM:
                    # Medium importance metrics need selective drill-down
                    suggestion = DrillDownSuggestion(
                        suggested_dimensions=["time_period", "channel"],
                        reasoning=f"Medium importance metric {analysis.metric_name} shows moderate changes. Focus on time and channel analysis.",
                        priority=2,
                        expected_insights=[
                            f"Understand temporal patterns in {analysis.metric_name}",
                            "Compare performance across different channels"
                        ]
                    )
                else:
                    # Low importance metrics need minimal drill-down
                    suggestion = DrillDownSuggestion(
                        suggested_dimensions=["time_period"],
                        reasoning=f"Low importance metric {analysis.metric_name} is stable. Monitor for trend changes over time.",
                        priority=3,
                        expected_insights=[
                            f"Monitor {analysis.metric_name} for future trend changes"
                        ]
                    )
                
                suggestions.append(suggestion)
            
            state["drill_down_suggestions"] = suggestions
            state["stage"] = "response_generation"
            
        except Exception as e:
            state["error"] = f"Suggestion generation failed: {str(e)}"
            
        return state

    async def _generate_response_node(self, state: MetricAgentState) -> MetricAgentState:
        """Generate final response with all analysis results"""
        try:
            # Compile all results into a comprehensive response
            response_data = {
                "metric_query": state.get("metric_query"),
                "charts": [chart.model_dump() for chart in state.get("chart_data", [])],
                "tables": [table.model_dump() for table in state.get("table_data", [])],
                "importance_analysis": [analysis.model_dump() for analysis in state.get("importance_analysis", [])],
                "drill_down_suggestions": [suggestion.model_dump() for suggestion in state.get("drill_down_suggestions", [])],
                "summary": self._generate_summary(state)
            }
            
            # Create AI message with the response
            ai_message = AIMessage(content=json.dumps(response_data, indent=2))
            state["messages"].append(ai_message)
            state["stage"] = "completed"
            
        except Exception as e:
            state["error"] = f"Response generation failed: {str(e)}"
            
        return state

    def _evaluate_performance(self, metric_data: Dict[str, Any]) -> str:
        """Evaluate metric performance"""
        change_rate = metric_data.get("change_rate", 0)
        if change_rate > 0.1:
            return "excellent"
        elif change_rate > 0.05:
            return "good"
        elif change_rate > -0.05:
            return "stable"
        elif change_rate > -0.1:
            return "concerning"
        else:
            return "poor"

    def _generate_importance_reasoning(self, metric_name: str, metric_data: Dict[str, Any]) -> str:
        """Generate reasoning for importance level"""
        change_rate = metric_data.get("change_rate", 0)
        trend = metric_data.get("trend", "stable")
        
        if abs(change_rate) > 0.1:
            return f"{metric_name} shows significant change ({change_rate:.2%}) with {trend} trend, requiring immediate attention."
        elif abs(change_rate) > 0.05:
            return f"{metric_name} shows moderate change ({change_rate:.2%}) with {trend} trend, worth monitoring."
        else:
            return f"{metric_name} shows minimal change ({change_rate:.2%}) with {trend} trend, currently stable."

    def _detect_anomalies(self, metric_data: Dict[str, Any]) -> List[str]:
        """Detect anomalies in metric data"""
        anomalies = []
        change_rate = metric_data.get("change_rate", 0)
        
        if abs(change_rate) > 0.2:
            anomalies.append(f"Extreme change rate: {change_rate:.2%}")
        
        trend = metric_data.get("trend", "stable")
        if trend == "decreasing" and change_rate < -0.1:
            anomalies.append("Significant downward trend detected")
        
        return anomalies

    def _generate_summary(self, state: MetricAgentState) -> str:
        """Generate analysis summary"""
        importance_analyses = state.get("importance_analysis", [])
        high_importance_count = sum(1 for a in importance_analyses if a.importance_level == MetricImportance.HIGH)
        
        return f"Analyzed {len(importance_analyses)} metrics. {high_importance_count} metrics require immediate attention. Drill-down suggestions provided for detailed analysis."

    async def process_metric_query(self, user_input: str, session_id: str, 
                                 user_id: str, tenant_id: str) -> Dict[str, Any]:
        """Process metric query and return comprehensive analysis"""
        try:
            # Initialize state
            initial_state = MetricAgentState(
                messages=[HumanMessage(content=user_input)],
                user_input=user_input,
                metric_query=None,
                raw_data={},
                chart_data=[],
                table_data=[],
                importance_analysis=[],
                drill_down_suggestions=[],
                session_id=session_id,
                user_id=user_id,
                tenant_id=tenant_id,
                error=None,
                stage="query_parsing"
            )
            
            # Compile and run workflow
            app = self.workflow.compile()
            final_state = await app.ainvoke(initial_state)
            
            if final_state.get("error"):
                return {
                    "success": False,
                    "error": final_state["error"],
                    "session_id": session_id
                }
            
            return {
                "success": True,
                "session_id": session_id,
                "metric_query": final_state.get("metric_query"),
                "charts": [chart.dict() for chart in final_state.get("chart_data", [])],
                "tables": [table.dict() for table in final_state.get("table_data", [])],
                "importance_analysis": [analysis.dict() for analysis in final_state.get("importance_analysis", [])],
                "drill_down_suggestions": [suggestion.dict() for suggestion in final_state.get("drill_down_suggestions", [])],
                "summary": self._generate_summary(final_state)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Metric query processing failed: {str(e)}",
                "session_id": session_id
            }


# Global instance management
_metric_agent_instances = {}


def get_metric_agent(session_id: str = None) -> MetricAgent:
    """Get or create metric agent instance"""
    if session_id is None:
        session_id = str(uuid.uuid4())
    
    if session_id not in _metric_agent_instances:
        _metric_agent_instances[session_id] = MetricAgent(session_id)
    
    return _metric_agent_instances[session_id]


if __name__ == "__main__":
    import asyncio
    
    async def example_usage():
        """Example usage of MetricAgent"""
        agent = get_metric_agent()
        
        # Example query
        user_input = "Show me sales revenue and user count for the last month, broken down by region"
        
        result = await agent.process_metric_query(
            user_input=user_input,
            session_id="test-session",
            user_id="test-user",
            tenant_id="test-tenant"
        )
        
        print("Metric Analysis Result:")
        print(json.dumps(result, indent=2))
    
    asyncio.run(example_usage())