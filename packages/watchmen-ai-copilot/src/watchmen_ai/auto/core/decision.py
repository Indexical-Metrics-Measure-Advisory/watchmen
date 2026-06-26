"""Decision model - records of governance decisions."""

from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class DecisionOutcome(str, Enum):
    """Outcome of a governance decision."""
    APPROVED = "approved"
    REJECTED = "rejected"
    DEFERRED = "deferred"  # Needs more information


class Decision(BaseModel):
    """A governance decision on a proposal."""
    decision_id: str
    proposal_id: str
    outcome: DecisionOutcome
    decided_by: str  # User ID or "auto" for automated decisions
    decided_at: datetime = Field(default_factory=datetime.utcnow)
    rationale: Optional[str] = None
    confidence_threshold_met: bool = True  # Whether agent confidence was sufficient
