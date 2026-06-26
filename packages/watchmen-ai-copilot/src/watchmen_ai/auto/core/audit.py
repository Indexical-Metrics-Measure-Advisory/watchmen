"""Audit model - tracks all ontology changes for traceability."""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class AuditAction(str, Enum):
    """Types of auditable actions."""
    ONTOLOGY_CREATED = "ontology_created"
    NODE_ADDED = "node_added"
    NODE_UPDATED = "node_updated"
    RELATION_ADDED = "relation_added"
    RELATION_UPDATED = "relation_updated"
    HEALTH_UPDATED = "health_updated"
    PROPOSAL_CREATED = "proposal_created"
    PROPOSAL_APPROVED = "proposal_approved"
    PROPOSAL_REJECTED = "proposal_rejected"
    PROPOSAL_MATERIALIZED = "proposal_materialized"
    PROPOSAL_FAILED = "proposal_failed"


class AuditEvent(BaseModel):
    """An audit event recording an ontology change."""
    event_id: str
    action: AuditAction
    ontology_id: str
    agent_type: Optional[str] = None  # Which agent triggered this
    proposal_id: Optional[str] = None  # Related proposal if any
    target_node_id: Optional[str] = None
    target_relation_id: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    user_id: Optional[str] = None  # Human user if applicable
