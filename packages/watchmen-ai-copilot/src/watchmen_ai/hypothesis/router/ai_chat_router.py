from datetime import datetime
from logging import getLogger
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException

from watchmen_ai.hypothesis.meta.chat_session_service import ChatSessionService
from watchmen_ai.hypothesis.model.chat import (
    ChatSession, SendMessageRequest, ChatResponse,
    ChatSuggestion, CreateSessionRequest, AssistantMessage, UserMessage
)
from watchmen_ai.hypothesis.utils.unicode_utils import sanitize_object_unicode
from watchmen_ai.hypothesis.agent.agent import get_chat_agent
from watchmen_auth import PrincipalService
from watchmen_indicator_surface.util import trans, trans_readonly
from watchmen_meta.common import ask_snowflake_generator, ask_meta_storage
from watchmen_rest import get_any_principal

router = APIRouter()
logger = getLogger(__name__)


def get_chat_session_service(principal_service: PrincipalService) -> ChatSessionService:
    """Get chat session service"""
    return ChatSessionService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


# Predefined chat suggestions - based on new multi-turn interaction logic
default_suggestions = [
    # Business problem input suggestions
    ChatSuggestion(
        id="1",
        text="Our customer acquisition cost is too high, need to analyze the reasons",
        category="business_problem_input",
        priority=1
    ),
    ChatSuggestion(
        id="2",
        text="Insurance product market penetration is declining, seeking solutions",
        category="business_problem_input",
        priority=2
    ),
    ChatSuggestion(
        id="3",
        text="Customer churn rate is rising, need to develop retention strategies",
        category="business_problem_input",
        priority=3
    ),
    # Document search suggestions
    ChatSuggestion(
        id="4",
        text="Find historical analysis reports on customer acquisition costs",
        category="document_search",
        priority=4
    ),
    ChatSuggestion(
        id="5",
        text="Search for past research on insurance industry market segmentation",
        category="document_search",
        priority=5
    ),
    # Deep conversation suggestions
    ChatSuggestion(
        id="6",
        text="Explain the key findings from historical reports",
        category="deep_conversation",
        priority=6
    ),
    ChatSuggestion(
        id="7",
        text="What insights do these analysis results provide for current business?",
        category="deep_conversation",
        priority=7
    ),
    ChatSuggestion(
        id="8",
        text="Based on these documents, what actions should we take?",
        category="deep_conversation",
        priority=8
    ),
    # Metrics inquiry suggestions
    ChatSuggestion(
        id="9",
        text="Show current sales revenue and conversion rate metrics",
        category="metrics_inquiry",
        priority=9
    ),
    ChatSuggestion(
        id="10",
        text="View latest data on user count and churn rate",
        category="metrics_inquiry",
        priority=10
    ),
    # Analysis confirmation suggestions
    ChatSuggestion(
        id="11",
        text="Confirm generation of new analysis report",
        category="confirmation_for_analysis",
        priority=11
    ),
    ChatSuggestion(
        id="12",
        text="Create comprehensive analysis based on discussion content",
        category="confirmation_for_analysis",
        priority=12
    ),
    # New analysis generation suggestions
    ChatSuggestion(
        id="13",
        text="Generate analysis report based on historical data and current metrics",
        category="new_analysis_generation",
        priority=13
    )
]


# Removed generate_ai_response function, now using ChatAgent to handle all AI responses


@router.post("/chat/send", tags=["chat"])
async def send_message(
    request: SendMessageRequest,
    principal_service: PrincipalService = Depends(get_any_principal)
) -> ChatResponse:
    """Send message and get AI reply"""
    try:
        chat_service = get_chat_session_service(principal_service)
        user_id = principal_service.get_user_id()
        tenant_id = principal_service.get_tenant_id()
        
        # Get or create session
        session_id = request.sessionId
        if not session_id:
            # Create new session
            session_id = str(uuid4())
            session = ChatSession(
                id=session_id,
                title="New Chat Session",
                messages=[],
                createdAt=datetime.now().isoformat(),
                updatedAt=datetime.now().isoformat(),
                analysisType=request.context.get("analysisType") if request.context else None,
                userId=user_id,
                tenantId=tenant_id
            )
            # Apply Unicode cleaning and create in transaction
            new_session = sanitize_object_unicode(session)
            trans(chat_service, lambda: chat_service.create(new_session))
            logger.info(f"Created new chat session {session_id} for user {user_id}")
        else:
            def find_session() -> ChatSession:
                session = chat_service.find_by_id_and_user(session_id, user_id, tenant_id)
                if not session:
                    raise HTTPException(status_code=404, detail="Session not found")
                return session
            
            session = trans_readonly(chat_service, find_session)
        
        # Re-fetch session to ensure latest state
        def refetch_session() -> ChatSession:
            session = chat_service.find_by_id_and_user(session_id, user_id, tenant_id)
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")
            return session
        
        session = trans_readonly(chat_service, refetch_session)
        
        # Create user message
        user_message = UserMessage(
            id=str(uuid4()),
            content=request.message,
            timestamp=datetime.now().isoformat()
        )

        # Use chat agent to process user message
        try:
            chat_agent = get_chat_agent()
            logger.info(f"Processing message for session {session_id}, user {user_id}: {request.message[:100]}...")
            
            agent_result = await chat_agent.process_message(
                user_input=request.message,
                session_id=session_id,
                user_id=user_id,
                tenant_id=tenant_id
            )
            
        except Exception as e:
            logger.error(f"Error calling chat agent: {str(e)}")
            agent_result = {
                "success": False,
                "error": f"Agent processing error: {str(e)}",
                "response": "Sorry, the AI agent encountered a technical issue during processing, please try again later."
            }
        
        # Check if agent processing was successful
        if not agent_result.get("success", False):
            logger.error(f"Chat agent processing failed for session {session_id}: {agent_result.get('error')}")
            ai_content = agent_result.get("response", "Sorry, there was an issue processing your request, please try again later.")
            metadata = {
                "processingTime": 0,
                "confidence": 0.0,
                "error": agent_result.get("error"),
                "conversationStage": "error",
                "success": False
            }
        else:
            logger.info(f"Chat agent processing successful for session {session_id}, stage: {agent_result.get('conversation_stage')}")
            ai_content = agent_result.get("response", "Processing completed")
            
            # Build rich metadata
            historical_reports = agent_result.get("historical_reports", [])
            conversation_stage = agent_result.get("conversation_stage", "unknown")
            
            # Set thinking steps based on conversation stage
            thinking_steps = []
            if conversation_stage == "business_problem_input":
                thinking_steps = ["Understand business problem description", "Identify key problem elements", "Confirm problem handling direction", "Prepare problem confirmation response"]
            elif conversation_stage == "document_search":
                thinking_steps = ["Analyze search requirements", "Execute document retrieval", "Evaluate document relevance", "Prepare document presentation"]
            elif conversation_stage == "deep_conversation":
                thinking_steps = ["Understand user's deep questions", "Analyze document content", "Extract key insights", "Generate in-depth answers"]
            elif conversation_stage == "metrics_inquiry":
                thinking_steps = ["Identify required metric types", "Query real-time data sources", "Process and validate data", "Format metric display"]
            elif conversation_stage == "confirmation_for_analysis":
                thinking_steps = ["Understand confirmation request", "Evaluate analysis readiness", "Confirm user intent", "Prepare confirmation response"]
            elif conversation_stage == "new_analysis_generation":
                thinking_steps = ["Integrate historical insights", "Combine current metrics", "Apply analysis framework", "Generate new analysis report"]
            else:
                thinking_steps = ["Understand user requirements", "Determine processing strategy", "Execute corresponding operations", "Prepare response content"]
            
            metadata = {
                "processingTime": 300,  # Actual processing time
                "confidence": 0.95,
                "conversationStage": conversation_stage,
                "analysis_answer":agent_result["analysis_answer"],
                "historicalReports": [
                    {
                        "id": report.get("id"),
                        "title": report.get("title"),
                        "relevanceScore": report.get("relevance_score", 0),
                        "contentType": report.get("content_type"),
                        "content": report.get("content"),
                        "semanticSection": report.get("semantic_section")
                    } for report in historical_reports[:5]  # Limit return count
                ],
                "analysisInsights": agent_result.get("analysis_insights", []),
                "thinkingSteps": thinking_steps,
                "metricsData": agent_result.get("metrics_data", {}),
                "generatedReport": agent_result.get("new_analysis_report"),
                "conversationContext": {
                    "hasHistoricalReports": agent_result.get("conversation_context", {}).get("has_historical_reports", False),
                    "reportsCount": agent_result.get("conversation_context", {}).get("reports_count", 0),
                    "hasMetrics": agent_result.get("conversation_context", {}).get("has_metrics", False)
                },
                "success": True
            }
        
        # Create AI reply message
        ai_message = AssistantMessage(
            id=str(uuid4()),
            content=ai_content,
            timestamp=datetime.now().isoformat(),
            metadata=metadata
        )
        
        # Update session
        session.messages.extend([user_message, ai_message])
        session.updatedAt = datetime.now().isoformat()
        
        # If it's a new session without a title, generate title based on first message
        if session.title == "New Chat Session" and len(session.messages) == 2:
            session.title = request.message[:50] + ("..." if len(request.message) > 50 else "")
        
        # Apply Unicode cleaning and save in transaction
        session = sanitize_object_unicode(session)
        trans(chat_service, lambda: chat_service.update(session))
        logger.debug(f"Updated session {session_id} with {len([user_message, ai_message])} new messages")
        
        logger.info(f"Chat response generated for session {session_id}, confidence: {metadata.get('confidence', 0):.2f}")
        
        return ChatResponse(
            message=ai_message,
            sessionId=session_id,
            analysisType=session.analysisType,
            metadata=metadata
        )
        
    except Exception as e:
        logger.error(f"Error in send_message: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/chat/suggestions", tags=["chat"])
async def get_chat_suggestions(
    session_id: Optional[str] = None,
    stage: Optional[str] = None,
    limit: int = 5,
    principal_service: PrincipalService = Depends(get_any_principal)
) -> List[ChatSuggestion]:
    """
    Get chat suggestions
    
    Return relevant chat suggestions based on current conversation stage and session state
    """
    try:
        # Filter suggestions by stage
        filtered_suggestions = default_suggestions
        
        if stage:
            # Return relevant suggestions based on different stages
            if stage == "business_problem_input":
                filtered_suggestions = [s for s in default_suggestions if s.category in ["business_problem_input", "document_search"]]
            elif stage == "document_search":
                filtered_suggestions = [s for s in default_suggestions if s.category in ["document_search", "deep_conversation"]]
            elif stage == "deep_conversation":
                filtered_suggestions = [s for s in default_suggestions if s.category in ["deep_conversation", "metrics_inquiry"]]
            elif stage == "metrics_inquiry":
                filtered_suggestions = [s for s in default_suggestions if s.category in ["metrics_inquiry", "confirmation_for_analysis"]]
            elif stage == "confirmation_for_analysis":
                filtered_suggestions = [s for s in default_suggestions if s.category in ["confirmation_for_analysis", "new_analysis_generation"]]
            elif stage == "new_analysis_generation":
                filtered_suggestions = [s for s in default_suggestions if s.category in ["new_analysis_generation", "business_problem_input"]]
        
        # Sort by priority and limit quantity
        sorted_suggestions = sorted(filtered_suggestions, key=lambda x: x.priority)
        return sorted_suggestions[:limit]
        
    except Exception as e:
        logger.error(f"Failed to get chat suggestions: {str(e)}")
        # Return default suggestions
        return default_suggestions[:limit]


@router.post("/chat/sessions", tags=["chat"])
async def create_session(
    request: CreateSessionRequest,
    principal_service: PrincipalService = Depends(get_any_principal)
) -> ChatSession:
    """Create new chat session"""
    try:
        chat_service = get_chat_session_service(principal_service)
        user_id = principal_service.get_user_id()
        tenant_id = principal_service.get_tenant_id()
        
        session_id = str(uuid4())
        new_session = ChatSession(
            id=session_id,
            title=request.title or "New Chat Session",
            messages=[],
            createdAt=datetime.now().isoformat(),
            updatedAt=datetime.now().isoformat(),
            analysisType=request.analysisType,
            userId=user_id,
            tenantId=tenant_id
        )
        
        # Apply Unicode cleaning and save in transaction
        new_session = sanitize_object_unicode(new_session)
        trans(chat_service, lambda: chat_service.create(new_session))
        return new_session
        
    except Exception as e:
        logger.error(f"Error in create_session: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/chat/sessions", tags=["chat"])
async def get_sessions(
    principal_service: PrincipalService = Depends(get_any_principal)
) -> List[ChatSession]:
    """Get user's chat session list"""
    try:
        chat_service = get_chat_session_service(principal_service)
        user_id = principal_service.get_user_id()
        tenant_id = principal_service.get_tenant_id()
        
        def action() -> List[ChatSession]:
            # Get user's sessions
            user_sessions = chat_service.find_by_user(user_id, tenant_id)
            # Sort by update time in descending order

            return user_sessions
        
        return trans_readonly(chat_service, action)
        
    except Exception as e:
        logger.error(f"Error fetching sessions: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/chat/sessions/{session_id}", tags=["chat"])
async def get_session(
    session_id: str,
    principal_service: PrincipalService = Depends(get_any_principal)
) -> ChatSession:
    """Get specific chat session"""
    try:
        chat_service = get_chat_session_service(principal_service)
        user_id = principal_service.get_user_id()
        tenant_id = principal_service.get_tenant_id()
        
        def action() -> ChatSession:
            # Get session
            session = chat_service.find_by_id_and_user(session_id, user_id, tenant_id)
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")
            return session
        
        return trans_readonly(chat_service, action)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/chat/sessions/{session_id}", tags=["chat"])
async def delete_session(
    session_id: str,
    principal_service: PrincipalService = Depends(get_any_principal)
) -> dict:
    """Delete chat session"""
    try:
        chat_service = get_chat_session_service(principal_service)
        user_id = principal_service.get_user_id()
        tenant_id = principal_service.get_tenant_id()
        
        # Delete session in transaction
        deleted = trans(chat_service, lambda: chat_service.delete_by_id_and_user(session_id, user_id, tenant_id))
        if not deleted:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {"success": True, "message": "Session deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in delete_session: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")