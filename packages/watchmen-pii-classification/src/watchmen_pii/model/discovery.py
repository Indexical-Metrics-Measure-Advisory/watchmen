"""Discovery request/response models for the Factor discovery engine.

These are the shapes returned by ``POST /dqc/pii-terms/{termId}/discover`` and
consumed by ``POST /dqc/pii-terms/{termId}/confirm`` (see the design doc's
section 10 API surface).
"""
from typing import List, Optional

from pydantic import BaseModel

from .pii_term import LinkedFactor


class DiscoverRequest(BaseModel):
	"""Body of ``POST /dqc/pii-terms/{termId}/discover``."""

	strategy: Optional[str] = None  # 'logic' | 'ai' | 'logic+ai'
	score_threshold: Optional[float] = 0.75


class DiscoverResult(BaseModel):
	"""Response of the discover endpoint."""

	termId: str
	linkedFactors: List[LinkedFactor] = []
	totalCount: int = 0


class ConfirmRequest(BaseModel):
	"""Body of ``POST /dqc/pii-terms/{termId}/confirm``."""

	factorIds: List[str] = []          # factor ids to mark confirmed
	removeFactorIds: List[str] = []    # factor ids to drop entirely
