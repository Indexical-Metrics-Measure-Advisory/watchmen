from typing import Dict, Any, List, Optional, TypedDict
import uuid

import uuid
from typing import Dict, Any, List, Optional, TypedDict

from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langgraph.graph import StateGraph, END

from watchmen_ai.hypothesis.agent.actions.conversation_stage_classifier import ConversationStageClassifier
from watchmen_ai.hypothesis.agent.actions.mcp_metric_connector import MCPConnector
from watchmen_ai.hypothesis.agent.actions.new_analysis_generater import NewAnalysisGenerator
from watchmen_ai.hypothesis.agent.actions.report_analyzer import ReportAnalyzer
from watchmen_ai.hypothesis.agent.session_manager import SessionState, get_session_manager
from watchmen_ai.hypothesis.agent.types import IntentType


class AgentState(TypedDict):
    """Agent state definition"""
    messages: List[BaseMessage]  # Message history
    user_input: str  # User input
    intent: Optional[IntentType]  # Recognized intent
    context: Dict[str, Any]  # Context information
    historical_reports: List[Dict[str, Any]]  # Retrieved historical analysis reports
    conversation_context: Dict[str, Any]  # Deep conversation context with reports
    metrics_data: Dict[str, Any]  # Metrics data from MCP
    analysis_insights: List[str]  # Analysis insights from conversation
    new_analysis_report: Optional[Dict[str, Any]]  # Newly generated analysis report
    session_id: str  # Session ID
    user_id: str  # User ID
    tenant_id: str  # Tenant ID
    error: Optional[str]  # Error information
    conversation_stage: str  # Current conversation stage


class ChatAgent:
    """LangGraph-based conversational analysis agent with session memory"""

    def __init__(self, session_id: str = None):
        self.session_id = session_id or str(uuid.uuid4())
        self.stage_classifier = ConversationStageClassifier()
        self.report_analyzer = ReportAnalyzer()
        self.mcp_connector = MCPConnector()
        self.analysis_generator = NewAnalysisGenerator()
        self.session_manager = get_session_manager()

        # Build LangGraph workflow
        self.workflow = self._build_workflow()

    def _build_workflow(self) -> StateGraph:
        """Build LangGraph workflow for multi-turn conversational analysis"""
        workflow = StateGraph(AgentState)

        # Add nodes following the multi-turn interaction logic
        workflow.add_node("stage_classification", self._stage_classification_node)
        workflow.add_node("business_problem_processing", self._business_problem_processing_node)
        workflow.add_node("document_search", self._document_search_node)
        workflow.add_node("document_presentation", self._document_presentation_node)
        workflow.add_node("deep_conversation", self._deep_conversation_node)
        workflow.add_node("metrics_inquiry", self._metrics_inquiry_node)
        workflow.add_node("confirmation_check", self._confirmation_check_node)
        workflow.add_node("new_analysis_generation", self._new_analysis_generation_node)
        workflow.add_node("response_generation", self._response_generation_node)

        # Set entry point
        workflow.set_entry_point("stage_classification")

        # Multi-turn routing logic
        workflow.add_conditional_edges(
            "stage_classification",
            self._route_by_stage,
            {
                "business_problem_processing": "business_problem_processing",
                "document_search": "document_search",
                "deep_conversation": "deep_conversation",
                "metrics_inquiry": "metrics_inquiry",
                "confirmation_check": "confirmation_check",
                "new_analysis_generation": "new_analysis_generation"
            }
        )

        # Business problem -> Document search
        workflow.add_edge("business_problem_processing", "document_search")

        # Document search -> Document presentation
        workflow.add_edge("document_search", "document_presentation")

        # Document presentation -> Deep conversation (multi-turn loop)
        workflow.add_edge("document_presentation", "deep_conversation")

        # Deep conversation routing (supports multi-turn)
        workflow.add_conditional_edges(
            "deep_conversation",
            self._route_after_conversation,
            {
                "continue_conversation": "response_generation",  # Continue multi-turn
                "metrics_inquiry": "metrics_inquiry",
                "confirmation_for_analysis": "confirmation_check",
                "response_generation": "response_generation"
            }
        )

        # Metrics inquiry routing
        workflow.add_conditional_edges(
            "metrics_inquiry",
            self._route_after_metrics,
            {
                "continue_conversation": "response_generation",  # Back to conversation with metrics
                "confirmation_for_analysis": "confirmation_check",
                "response_generation": "response_generation"
            }
        )

        # Confirmation check routing
        workflow.add_conditional_edges(
            "confirmation_check",
            self._route_after_confirmation,
            {
                "generate_analysis": "new_analysis_generation",
                "continue_conversation": "response_generation"
            }
        )

        # Final connections
        workflow.add_edge("new_analysis_generation", "response_generation")
        workflow.add_edge("response_generation", END)
        # memory = MemorySaver()
        return workflow.compile()

    async def _stage_classification_node(self, state: AgentState) -> AgentState:
        """Classify conversation stage for multi-turn interaction"""

        print("_stage_classification_node")
        stage = await self.stage_classifier.classify_stage(
            state["user_input"], state["conversation_context"]
        )
        state["conversation_stage"] = stage

        # Add system message
        state["messages"].append(
            SystemMessage(content=f"Conversation stage: {stage}")
        )

        return state

    async def _business_problem_processing_node(self, state: AgentState) -> AgentState:
        """Process business problem/challenge input"""
        # Store the business problem for context
        print("_business_problem_processing_node")
        state["conversation_context"]["business_problem"] = state["user_input"]
        state["conversation_context"]["conversation_state"] = "problem_identified"

        # Add to conversation history
        state["conversation_context"]["user_questions"] = [state["user_input"]]

        return state

    async def _document_search_node(self, state: AgentState) -> AgentState:
        """Search for relevant analysis documents"""
        # Use business problem or current input for search
        print("_document_search_node")
        search_query = state["conversation_context"].get("business_problem", state["user_input"])

        historical_reports = await self.report_analyzer.retrieve_historical_reports(
            search_query, limit=5
        )



        state["historical_reports"] = historical_reports

        # Update conversation context
        state["conversation_context"]["has_historical_reports"] = len(historical_reports) > 0
        state["conversation_context"]["reports_count"] = len(historical_reports)
        state["conversation_context"][
            "conversation_state"] = "documents_found" if historical_reports else "no_documents"

        return state

    async def _document_presentation_node(self, state: AgentState) -> AgentState:
        """Present found documents to user"""
        print("_document_presentation_node")
        if not state["historical_reports"]:
            state["conversation_context"]["presentation_message"] = "No relevant historical analysis documents found."
        else:
            # Prepare document presentation
            reports = state["historical_reports"]
            presentation = f"Found {len(reports)} relevant historical analysis documents:\n\n"

            for i, report in enumerate(reports[:3], 1):  # Show top 3
                presentation += f"{i}. **{report['title']}** (Relevance: {report['relevance_score']:.2f})\n"
                presentation += f"   Content Summary: {report['content'][:100]}...\n\n"

            presentation += "You can inquire about the detailed content of these documents or raise specific questions for in-depth discussion."
            state["conversation_context"]["presentation_message"] = presentation

        # Update conversation state
        state["conversation_context"]["conversation_state"] = "documents_presented"

        return state

    async def _deep_conversation_node(self, state: AgentState) -> AgentState:
        """Handle deep conversation with analysis documents"""



        if not state["historical_reports"]:
            # No reports found, set empty context
            state["conversation_context"]["analysis_context"] = {}
            state["conversation_context"]["conversation_state"] = "no_documents"
            return state

        # Analyze report content based on user question
        analysis_context = await self.report_analyzer.analyze_report_content(
            state["historical_reports"], state["user_input"]
        )
        report_full_content = state["historical_reports"]
        answer = await  self.report_analyzer.ask_question_for_report(state["user_input"],report_full_content)

        state["conversation_context"]["analysis_answer"] = answer

        state["conversation_context"]["analysis_context"] = analysis_context


        # Extract insights from conversation
        insights = []
        for finding in analysis_context.get("key_findings", []):
            insights.append(f"Finding: {finding['finding']}")
        for rec in analysis_context.get("recommendations", []):
            insights.append(f"Recommendation: {rec['recommendation']}")

        state["analysis_insights"] = insights

        # Update conversation state and history
        state["conversation_context"]["conversation_state"] = "in_conversation"
        if "user_questions" not in state["conversation_context"]:
            state["conversation_context"]["user_questions"] = []
        state["conversation_context"]["user_questions"].append(state["user_input"])

        return state

    async def _metrics_inquiry_node(self, state: AgentState) -> AgentState:
        """Fetch metrics data from MCP"""
        print("_metrics_inquiry_node")
        # Determine required metrics based on user input and conversation context
        required_metrics = await self._extract_required_metrics(state["user_input"])

        if required_metrics:
            metrics_data = await self.mcp_connector.fetch_metrics(required_metrics)
            state["metrics_data"] = metrics_data
        else:
            state["metrics_data"] = {}

        # Update conversation context
        state["conversation_context"]["has_metrics"] = len(state["metrics_data"]) > 0
        state["conversation_context"]["conversation_state"] = "metrics_obtained"

        return state

    async def _confirmation_check_node(self, state: AgentState) -> AgentState:
        """Check if user confirms to generate new analysis"""
        print("_confirmation_check_node")
        user_input_lower = state["user_input"].lower()

        # Check for confirmation keywords
        confirmation_keywords = [
            "confirm", "yes", "proceed", "generate", "create", "ready", "go ahead"
        ]

        is_confirmed = any(keyword in user_input_lower for keyword in confirmation_keywords)

        state["conversation_context"]["analysis_confirmed"] = is_confirmed
        state["conversation_context"][
            "conversation_state"] = "analysis_confirmed" if is_confirmed else "confirmation_pending"

        return state

    async def _new_analysis_generation_node(self, state: AgentState) -> AgentState:
        """Generate new analysis report"""
        # Generate comprehensive new analysis
        print("_new_analysis_generation_node")
        new_analysis = await self.analysis_generator.generate_new_analysis(
            state["user_input"],
            state["conversation_context"].get("analysis_context", {}),
            state["metrics_data"],
            state["analysis_insights"]
        )
        state["new_analysis_report"] = new_analysis

        return state

    async def _response_generation_node(self, state: AgentState) -> AgentState:
        """Response generation node"""
        print("_response_generation_node")
        # Generate final response based on conversation stage and available data
        response_content = await self._generate_final_response(state)

        state["messages"].append(
            AIMessage(content=response_content)
        )

        return state

    async def _route_by_stage(self, state: AgentState) -> str:
        """Route based on conversation stage for multi-turn interaction"""
        stage = state["conversation_stage"]

        if stage == "business_problem_input":
            return "business_problem_processing"
        elif stage == "document_search":
            return "document_search"
        elif stage == "deep_conversation":
            return "deep_conversation"
        elif stage == "metrics_inquiry":
            return "metrics_inquiry"
        elif stage == "confirmation_for_analysis":
            return "confirmation_check"
        elif stage == "new_analysis_generation":
            return "new_analysis_generation"
        else:
            return "document_search"  # Default to document search

    async def _route_after_conversation(self, state: AgentState) -> str:
        """Route after deep conversation - supports multi-turn interaction"""
        user_input_lower = state["user_input"].lower()

        # Check if user wants metrics data
        metrics_keywords = ["metric", "data", "number", "current", "latest", "trend"]
        if any(keyword in user_input_lower for keyword in metrics_keywords):
            return "metrics_inquiry"

        # Check if user wants to confirm analysis generation
        confirmation_keywords = ["confirm", "generate", "create", "ready"]
        if any(keyword in user_input_lower for keyword in confirmation_keywords):
            return "confirmation_for_analysis"

        # Default to continue conversation (multi-turn support)
        return "continue_conversation"

    async def _route_after_metrics(self, state: AgentState) -> str:
        """Route after metrics inquiry"""
        user_input_lower = state["user_input"].lower()

        # Check if user wants to confirm analysis generation
        confirmation_keywords = ["confirm", "generate", "create", "ready"]
        if any(keyword in user_input_lower for keyword in confirmation_keywords):
            return "confirmation_for_analysis"

        # Default to continue conversation with metrics data
        return "continue_conversation"

    async def _route_after_confirmation(self, state: AgentState) -> str:
        """Route after confirmation check"""
        is_confirmed = state["conversation_context"].get("analysis_confirmed", False)

        if is_confirmed:
            return "generate_analysis"
        else:
            return "continue_conversation"

    async def _extract_required_metrics(self, user_input: str) -> List[str]:
        """Extract required metrics from user input"""
        available_metrics = await self.mcp_connector.get_available_metrics()
        required_metrics = []

        user_input_lower = user_input.lower()
        for metric in available_metrics:
            # Simple keyword matching
            if any(keyword in user_input_lower for keyword in metric.split("_")):
                required_metrics.append(metric)

        # If no specific metrics, return default core metrics
        if not required_metrics:
            required_metrics = ["sales_revenue", "user_count", "conversion_rate"]

        return required_metrics

    async def _generate_final_response(self, state: AgentState) -> str:
        """Generate final response based on conversation stage and available data"""
        stage = state["conversation_stage"]
        conversation_state = state["conversation_context"].get("conversation_state", "")

        # Handle different conversation stages for multi-turn interaction
        if stage == "business_problem_input":
            return await self._generate_problem_acknowledgment_response(state)
        elif stage == "document_search" or conversation_state == "documents_presented":
            return await self._generate_document_presentation_response(state)
        elif stage == "deep_conversation" or conversation_state == "in_conversation":
            return await self._generate_discussion_response(state)
        elif stage == "metrics_inquiry" or conversation_state == "metrics_obtained":
            return await self._generate_metrics_response(state)
        elif stage == "confirmation_for_analysis":
            return await self._generate_confirmation_response(state)
        elif stage == "new_analysis_generation" and state.get("new_analysis_report"):
            return await self._generate_analysis_response(state)
        else:
            return await self._generate_default_response(state)

    async def _generate_problem_acknowledgment_response(self, state: AgentState) -> str:
        """Generate response acknowledging business problem input"""
        user_input = state.get("user_input", "")
        business_problem = state["conversation_context"].get("business_problem", "")

        response = f"I understand the business problem you raised: {business_problem}\n\n"
        response += "Let me search for relevant analysis documents to provide you with targeted insights and suggestions.\n\n"
        response += "Searching for relevant documents..."

        return response

    async def _generate_document_presentation_response(self, state: AgentState) -> str:
        """Generate response presenting found documents"""
        reports = state.get("historical_reports", [])

        if not reports:
            return "Sorry, I did not find any analysis documents directly related to your business problem. You can provide more specific information, or we can start a new analysis directly."

        response = "I found the following relevant analysis documents:\n\n"

        for i, report in enumerate(reports[:3], 1):  # Limit to top 3 results
            response += f"{i}. **{report.get('title', 'Untitled Report')}**\n"
            response += f"   - Relevance Score: {report.get('score', 0):.2f}\n"
            response += f"   - Content Preview: {report.get('content', '')[:200]}...\n\n"

        response += "You can choose to learn more about any report in depth, or raise specific questions for in-depth discussion. I will provide detailed analysis and insights based on these documents."
        return response

    async def _generate_confirmation_response(self, state: AgentState) -> str:
        """Generate response for analysis confirmation"""
        is_confirmed = state["conversation_context"].get("analysis_confirmed", False)

        if is_confirmed:
            response = "Okay, I will generate a new analysis document for you based on our discussion content and related data.\n\n"
            response += "Integrating the following information:\n"
            response += "- Your business problems and needs\n"
            response += "- Insights from relevant historical analysis documents\n"
            response += "- Latest indicator data obtained\n"
            response += "- Key points in our discussion\n\n"
            response += "Please wait, generating analysis report..."
        else:
            response = "I understand you need more information or discussion.\n\n"
            response += "You can:\n"
            response += "- Continue to ask questions about existing documents\n"
            response += "- Request specific indicator data\n"
            response += "- Explore deeper analysis perspectives\n\n"
            response += "When you are ready to generate a new analysis document, please let me know."

        return response

    async def _generate_search_response(self, state: AgentState) -> str:
        """Generate response for historical report search"""
        reports = state["historical_reports"]
        response_parts = [
            f"I found {len(reports)} relevant historical analysis reports:\n"
        ]

        for i, report in enumerate(reports[:3], 1):  # Show top 3
            response_parts.append(
                f"{i}. **{report['title']}** (Relevance: {report['relevance_score']:.2f})\n"
                f"   Type: {report['content_type']} | Semantic Section: {report['semantic_section']}\n"
                f"   Content Summary: {report['content'][:100]}...\n"
            )

        response_parts.append("\nWhich report would you like to know more about, or what specific questions do you want to discuss?")
        return "".join(response_parts)

    async def _generate_discussion_response(self, state: AgentState) -> str:
        """Generate response for report discussion"""
        analysis_context = state["conversation_context"].get("analysis_context", {})



        if not analysis_context:
            return "Sorry, I did not find relevant historical reports to answer your question. You can try searching with different keywords, or tell me directly what you want to know."

        # Use report analyzer to generate conversational response
        return await self.report_analyzer.generate_conversation_response(
            analysis_context, state["user_input"], state.get("metrics_data")
        )

    async def _generate_metrics_response(self, state: AgentState) -> str:
        """Generate response for metrics inquiry"""
        metrics_data = state.get("metrics_data", {})

        if not metrics_data:
            return "Sorry, I did not find the indicator data you requested. Please check the indicator name or try again later."

        response_parts = ["## Current Indicator Data\n"]

        for metric_name, metric_info in metrics_data.items():
            trend_indicator = "📈" if metric_info.get("trend") == "increasing" else "📉" if metric_info.get(
                "trend") == "decreasing" else "➡️"
            change_rate = metric_info.get("change_rate", 0)

            response_parts.append(
                f"**{metric_name}**: {metric_info.get('value')} {metric_info.get('unit', '')} {trend_indicator}\n"
                f"Change Rate: {change_rate:+.1%} | Trend: {metric_info.get('trend', 'stable')}\n"
            )

        response_parts.append("\nDo you need me to generate a new in-depth analysis report based on this data and historical analysis?")
        return "".join(response_parts)

    async def _generate_analysis_response(self, state: AgentState) -> str:
        """Generate response for new analysis generation"""
        new_analysis = state["new_analysis_report"]

        response_parts = [
            f"# {new_analysis['title']}\n\n",
            f"**Analysis ID**: {new_analysis['id']}\n",
            f"**Creation Time**: {new_analysis['created_at']}\n\n",
            "## Executive Summary\n",
            f"{new_analysis['sections']['executive_summary']}\n\n"
        ]

        # Add key sections
        if new_analysis['sections'].get('historical_insights'):
            response_parts.append("## Historical Insights\n")
            for insight in new_analysis['sections']['historical_insights'][:3]:
                response_parts.append(f"- {insight}\n")
            response_parts.append("\n")

        if new_analysis['sections'].get('recommendations'):
            response_parts.append("## Key Recommendations\n")
            for rec in new_analysis['sections']['recommendations'][:3]:
                response_parts.append(f"- {rec}\n")
            response_parts.append("\n")

        response_parts.append("The complete analysis report has been generated, including a comprehensive analysis of historical analysis, current indicators, and conversation insights.")
        return "".join(response_parts)

    async def _generate_default_response(self, state: AgentState) -> str:
        """Generate default response for multi-turn interaction"""
        return (
            "Hello! I am your AI analysis assistant, specializing in helping you with business analysis and decision support.\n\n"
            "I can provide you with the following services:\n\n"
            "🎯 **Business Problem Analysis** - Understand your business challenges and needs\n"
            "🔍 **Document Search** - Find relevant historical analysis documents\n"
            "💬 **In-depth Conversation** - Conduct multi-turn in-depth discussions based on document content\n"
            "📊 **Indicator Query** - Get the latest business indicator data\n"
            "📋 **Generate New Analysis** - Create a new analysis report by integrating all information\n\n"
            "Please tell me about the business problem or challenge you encountered, and I will provide you with comprehensive analysis support."
        )

    async def process_message(self, user_input: str, session_id: str,
                              user_id: str, tenant_id: str) -> Dict[str, Any]:
        """Process user message with session memory"""
        # Get or create session state
        session_state = await self.session_manager.get_session(session_id, user_id, tenant_id)

        # Initialize state with session context
        initial_state = AgentState(
            messages=[HumanMessage(content=user_input)],
            user_input=user_input,
            intent=None,
            context=session_state.context,
            historical_reports=session_state.historical_reports,
            conversation_context={
                "has_historical_reports": len(session_state.historical_reports) > 0,
                "reports_count": len(session_state.historical_reports),
                "has_metrics": len(session_state.metrics_data) > 0,
                "analysis_context": session_state.analysis_context,
                "user_questions": session_state.user_questions,
                "discussion_history": session_state.discussion_history,
                "conversation_state": session_state.conversation_state
            },
            metrics_data=session_state.metrics_data,
            analysis_insights=session_state.analysis_insights,
            new_analysis_report=None,
            session_id=session_id,
            user_id=user_id,
            tenant_id=tenant_id,
            error=None,
            conversation_stage=session_state.conversation_stage
        )

        try:
            # Execute workflow
            final_state = await self.workflow.ainvoke(initial_state)

            # Extract AI response
            ai_messages = [msg for msg in final_state["messages"] if isinstance(msg, AIMessage)]
            response_content = ai_messages[-1].content if ai_messages else "Processing completed"

            # Update session state with new information
            await self._update_session_state(session_state, final_state, user_input, response_content)

            # print("final_state",final_state.get("conversation_context"))

            return {
                "success": True,
                "response": response_content,
                "analysis_answer":final_state.get("conversation_context")["analysis_answer"],
                "conversation_stage": final_state.get("conversation_stage"),
                "historical_reports": final_state.get("historical_reports", []),
                "analysis_insights": final_state.get("analysis_insights", []),
                "metrics_data": final_state.get("metrics_data", {}),
                "new_analysis_report": final_state.get("new_analysis_report"),
                "conversation_context": final_state.get("conversation_context", {}),
                "session_id": session_id
            }

        except Exception as e:
            # print e stack
            import traceback
            traceback.print_exc()
            # Handle errors gracefully
            return {
                "success": False,
                "error": str(e),
                "response": "抱歉，处理您的请求时遇到了错误，请稍后重试。",
                "session_id": session_id
            }

    async def _update_session_state(self, session_state: SessionState, final_state: AgentState,
                                    user_input: str, ai_response: str) -> None:
        """Update session state with new conversation information"""
        # Update basic session info
        session_state.conversation_stage = final_state.get("conversation_stage", "")
        session_state.conversation_state = final_state.get("conversation_context", {}).get("conversation_state",
                                                                                           session_state.conversation_state)

        # Update historical reports if new ones were found
        new_reports = final_state.get("historical_reports", [])
        if new_reports:
            await self.session_manager.add_historical_reports(session_state.session_id, new_reports)

        # Update metrics data if new metrics were obtained
        new_metrics = final_state.get("metrics_data", {})
        if new_metrics:
            await self.session_manager.add_metrics_data(session_state.session_id, new_metrics)

        # Add user question to history
        await self.session_manager.add_user_question(session_state.session_id, user_input)

        # Add discussion entry
        await self.session_manager.add_discussion_entry(
            session_state.session_id, user_input, ai_response,
            final_state.get("conversation_stage", "")
        )

        # Update analysis context if available
        analysis_context = final_state.get("conversation_context", {}).get("analysis_context", {})
        if analysis_context:
            session_state.analysis_context.update(analysis_context)

        # Update analysis insights
        new_insights = final_state.get("analysis_insights", [])
        if new_insights:
            session_state.analysis_insights.extend(new_insights)

        # Add generated report if available
        new_analysis_report = final_state.get("new_analysis_report")
        if new_analysis_report:
            await self.session_manager.add_generated_report(session_state.session_id, new_analysis_report)

        # Update additional context
        session_state.context.update(final_state.get("context", {}))

        # Save updated session
        await self.session_manager.save_session(session_state)


# Global agent instances cache
_chat_agent_instances = {}


def get_chat_agent(session_id: str = None) -> ChatAgent:
    """Get chat agent instance with session support"""
    global _chat_agent_instances

    if session_id is None:
        session_id = "default"

    if session_id not in _chat_agent_instances:
        _chat_agent_instances[session_id] = ChatAgent(session_id)

    return _chat_agent_instances[session_id]


if __name__ == "__main__":
    # Example usage with session memory
    import asyncio


    async def example_usage():
        # Create agent with session support
        session_id = "test_session_122"
        user_id = "user_456"
        tenant_id = "tenant_789"

        agent = get_chat_agent(session_id)

        # Multi-turn conversation example
        conversations = [
            "find Underwriting Efficiency",
            "Please explain the key findings in the historical report in detail",
            "Explain what this document specifically says",
            "Explain what this document specifically says"
        ]

        print("=== Multi-turn Conversation Example (with Session Memory)===")
        for i, user_input in enumerate(conversations, 1):
            print(f"\n--- Round {i} Conversation ---")
            print(f"User: {user_input}")

            response = await agent.process_message(user_input, session_id, user_id, tenant_id)

            print(f"AI: {response.get('response', 'No response generated')}")
            print(f"Conversation Stage: {response.get('conversation_stage', 'unknown')}")
            print(f"Number of Historical Reports: {len(response.get('historical_reports', []))}")
            print(f"Indicator Data: {len(response.get('metrics_data', {}))} indicators")

            if response.get('new_analysis_report'):
                print("✅ Generated new analysis report")

        print("\n=== Session Memory Test ===")
        # Test session memory by creating a new agent instance with same session_id
        new_agent = get_chat_agent(session_id)
        test_response = await new_agent.process_message(
            "Recall what we discussed before", session_id, user_id, tenant_id
        )
        print(f"Memory Test: {test_response.get('response', 'No response')}")


    asyncio.run(example_usage())
