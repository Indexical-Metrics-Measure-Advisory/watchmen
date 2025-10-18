from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import json
import os
from pathlib import Path

from watchmen_utilities import ExtendedBaseModel


class SessionState(ExtendedBaseModel):
    """Session state for persistent conversation context"""
    
    def __init__(self, **data):
        super().__init__(**data)
        
    session_id: str
    user_id: str
    tenant_id: str
    created_at: datetime
    updated_at: datetime
    
    # Persistent conversation context
    conversation_state: str = "initial"  # initial, documents_found, in_conversation, metrics_obtained
    conversation_stage: str = ""
    
    # Historical reports found in this session
    historical_reports: List[Dict[str, Any]] = []
    
    # Analysis context from deep conversation
    analysis_context: Dict[str, Any] = {}
    
    # Metrics data obtained in this session
    metrics_data: Dict[str, Any] = {}
    
    # Analysis insights accumulated
    analysis_insights: List[str] = []
    
    # User questions history
    user_questions: List[str] = []
    
    # Discussion history for context
    discussion_history: List[Dict[str, Any]] = []
    
    # Generated analysis reports in this session
    generated_reports: List[Dict[str, Any]] = []
    
    # Additional context information
    context: Dict[str, Any] = {}


class SessionManager(ExtendedBaseModel):
    """Session manager for persistent conversation state"""
    
    def __init__(self, storage_path: str = None):
        super().__init__()
        # Default storage path
        if storage_path is None:
            storage_path = os.path.join(os.path.expanduser("~"), ".watchmen_ai", "sessions")

        print(storage_path)
        
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        
        # In-memory cache for active sessions
        self._session_cache: Dict[str, SessionState] = {}
        
        # Session expiry time (default: 24 hours)
        self.session_expiry = timedelta(hours=24)
    
    def _get_session_file_path(self, session_id: str) -> Path:
        """Get file path for session storage"""
        return self.storage_path / f"{session_id}.json"
    
    async def get_session(self, session_id: str, user_id: str, tenant_id: str) -> SessionState:
        """Get or create session state"""
        # Check cache first
        if session_id in self._session_cache:
            session = self._session_cache[session_id]
            # Update access time
            session.updated_at = datetime.now()
            return session
        
        # Try to load from storage
        session_file = self._get_session_file_path(session_id)
        if session_file.exists():
            try:
                with open(session_file, 'r', encoding='utf-8') as f:
                    session_data = json.load(f)
                
                # Parse datetime fields
                session_data['created_at'] = datetime.fromisoformat(session_data['created_at'])
                session_data['updated_at'] = datetime.fromisoformat(session_data['updated_at'])
                
                session = SessionState(**session_data)
                
                # Check if session is expired
                if datetime.now() - session.updated_at > self.session_expiry:
                    # Session expired, create new one
                    session = self._create_new_session(session_id, user_id, tenant_id)
                else:
                    # Update access time
                    session.updated_at = datetime.now()
                
                # Cache the session
                self._session_cache[session_id] = session
                return session
                
            except Exception as e:
                print(f"Error loading session {session_id}: {e}")
                # Create new session if loading fails
                pass
        
        # Create new session
        session = self._create_new_session(session_id, user_id, tenant_id)
        self._session_cache[session_id] = session
        return session
    
    def _create_new_session(self, session_id: str, user_id: str, tenant_id: str) -> SessionState:
        """Create a new session state"""
        now = datetime.now()
        return SessionState(
            session_id=session_id,
            user_id=user_id,
            tenant_id=tenant_id,
            created_at=now,
            updated_at=now
        )
    
    async def save_session(self, session: SessionState) -> None:
        """Save session state to storage"""
        session.updated_at = datetime.now()
        
        # Update cache
        self._session_cache[session.session_id] = session
        
        # Save to file
        session_file = self._get_session_file_path(session.session_id)
        try:
            # Convert to dict for JSON serialization
            session_dict = session.dict()
            # Convert datetime to ISO format
            session_dict['created_at'] = session.created_at.isoformat()
            session_dict['updated_at'] = session.updated_at.isoformat()
            
            with open(session_file, 'w', encoding='utf-8') as f:
                json.dump(session_dict, f, ensure_ascii=False, indent=2)
                
        except Exception as e:
            print(f"Error saving session {session.session_id}: {e}")
    
    async def update_session_context(self, session_id: str, **updates) -> None:
        """Update specific fields in session context"""
        if session_id in self._session_cache:
            session = self._session_cache[session_id]
            
            # Update fields
            for key, value in updates.items():
                if hasattr(session, key):
                    setattr(session, key, value)
            
            # Save updated session
            await self.save_session(session)
    
    async def add_historical_reports(self, session_id: str, reports: List[Dict[str, Any]]) -> None:
        """Add historical reports to session"""
        if session_id in self._session_cache:
            session = self._session_cache[session_id]
            
            # Merge new reports with existing ones (avoid duplicates)
            existing_ids = {report.get('id') for report in session.historical_reports}
            new_reports = [report for report in reports if report.get('id') not in existing_ids]
            
            session.historical_reports.extend(new_reports)
            session.conversation_state = "documents_found"
            
            await self.save_session(session)
    
    async def add_metrics_data(self, session_id: str, metrics: Dict[str, Any]) -> None:
        """Add metrics data to session"""
        if session_id in self._session_cache:
            session = self._session_cache[session_id]
            
            # Merge metrics data
            session.metrics_data.update(metrics)
            session.conversation_state = "metrics_obtained"
            
            await self.save_session(session)
    
    async def add_user_question(self, session_id: str, question: str) -> None:
        """Add user question to history"""
        if session_id in self._session_cache:
            session = self._session_cache[session_id]
            session.user_questions.append(question)
            await self.save_session(session)
    
    async def add_discussion_entry(self, session_id: str, user_input: str, ai_response: str, stage: str) -> None:
        """Add discussion entry to history"""
        if session_id in self._session_cache:
            session = self._session_cache[session_id]
            
            discussion_entry = {
                "timestamp": datetime.now().isoformat(),
                "user_input": user_input,
                "ai_response": ai_response,
                "stage": stage
            }
            
            session.discussion_history.append(discussion_entry)
            session.conversation_state = "in_conversation"
            
            await self.save_session(session)
    
    async def add_generated_report(self, session_id: str, report: Dict[str, Any]) -> None:
        """Add generated analysis report to session"""
        if session_id in self._session_cache:
            session = self._session_cache[session_id]
            session.generated_reports.append(report)
            await self.save_session(session)
    
    async def clear_session(self, session_id: str) -> None:
        """Clear session data"""
        # Remove from cache
        if session_id in self._session_cache:
            del self._session_cache[session_id]
        
        # Remove file
        session_file = self._get_session_file_path(session_id)
        if session_file.exists():
            try:
                session_file.unlink()
            except Exception as e:
                print(f"Error deleting session file {session_id}: {e}")
    
    async def cleanup_expired_sessions(self) -> None:
        """Clean up expired sessions"""
        current_time = datetime.now()
        
        # Clean up cache
        expired_sessions = []
        for session_id, session in self._session_cache.items():
            if current_time - session.updated_at > self.session_expiry:
                expired_sessions.append(session_id)
        
        for session_id in expired_sessions:
            del self._session_cache[session_id]
        
        # Clean up files
        for session_file in self.storage_path.glob("*.json"):
            try:
                with open(session_file, 'r', encoding='utf-8') as f:
                    session_data = json.load(f)
                
                updated_at = datetime.fromisoformat(session_data['updated_at'])
                if current_time - updated_at > self.session_expiry:
                    session_file.unlink()
                    
            except Exception as e:
                print(f"Error processing session file {session_file}: {e}")


# Global session manager instance
_session_manager_instance = None


def get_session_manager() -> SessionManager:
    """Get session manager instance (singleton pattern)"""
    global _session_manager_instance
    if _session_manager_instance is None:
        _session_manager_instance = SessionManager()
    return _session_manager_instance