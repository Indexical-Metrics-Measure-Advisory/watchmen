"""Base class for all Ontology Control Plane agents.

All agents follow the unified loop:
  Observe → Discover → Reason → Propose → Approve → Materialize → Monitor → Learn → Update Ontology
"""

import logging
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from watchmen_ai.auto.context_bridge import WatchmenDataBridge
from watchmen_ai.auto.core import (
    AuditAction,
    AuditEvent,
    BusinessOntology,
    Decision,
    DecisionOutcome,
    Proposal,
    ProposalStatus,
)

logger = logging.getLogger(__name__)


class BaseOntologyAgent(ABC):
    """Base class for ontology agents.

    Subclasses implement the abstract methods to define their specific
    observe/reason/propose logic while inheriting the unified loop.
    """

    agent_type: str = "base"

    def __init__(
        self,
        ontology: BusinessOntology,
        data_bridge: Optional[WatchmenDataBridge] = None,
    ):
        self.ontology = ontology
        self.data_bridge = data_bridge
        self.pending_proposals: List[Proposal] = []
        self.audit_log: List[AuditEvent] = []

    # ------------------------------------------------------------------
    # Unified loop steps
    # ------------------------------------------------------------------

    @abstractmethod
    def observe(self) -> Dict[str, Any]:
        """Observe the current state (metadata, data quality, patterns, etc.)."""
        ...

    @abstractmethod
    def discover(self, observation: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Discover anomalies, opportunities, or changes from the observation."""
        ...

    @abstractmethod
    def reason(self, discoveries: List[Dict[str, Any]]) -> List[Proposal]:
        """Reason about discoveries and generate proposals."""
        ...

    def propose(self, proposals: List[Proposal]) -> List[Proposal]:
        """Submit proposals for approval. Default: store in pending list."""
        self.pending_proposals.extend(proposals)
        for p in proposals:
            self._audit(AuditAction.PROPOSAL_CREATED, proposal_id=p.proposal_id)
        return proposals

    def approve(self, proposals: List[Proposal], auto_approve: bool = False) -> List[Proposal]:
        """Approve proposals. If auto_approve, approve all; otherwise keep pending."""
        approved = []
        for p in proposals:
            if auto_approve or p.confidence >= 0.9:
                p.approve(decided_by="auto" if auto_approve else "system")
                self._audit(AuditAction.PROPOSAL_APPROVED, proposal_id=p.proposal_id)
                approved.append(p)
        return approved

    @abstractmethod
    def materialize(self, proposals: List[Proposal]) -> List[Proposal]:
        """Apply approved proposals to the ontology."""
        ...

    def monitor(self, proposals: List[Proposal]) -> List[Proposal]:
        """Post-materialization validation. Default: mark all as materialized."""
        for p in proposals:
            p.mark_materialized()
            self._audit(AuditAction.PROPOSAL_MATERIALIZED, proposal_id=p.proposal_id)
        return proposals

    def learn(self, proposals: List[Proposal]) -> None:
        """Learn from the results. Subclasses can override to update internal state."""
        pass

    # ------------------------------------------------------------------
    # Run the full loop
    # ------------------------------------------------------------------

    def run(self, auto_approve: bool = False) -> List[Proposal]:
        """Execute the full agent loop and return materialized proposals."""
        logger.info("[%s] Starting loop", self.agent_type)

        observation = self.observe()

        # Inject Watchmen context if data_bridge is available
        if self.data_bridge is not None:
            try:
                bundle = self.data_bridge.fetch_full_context()
                observation["watchmen_context"] = {
                    "topics": [t.model_dump(mode="json") for t in bundle.topics],
                    "pipelines": [p.model_dump(mode="json") for p in bundle.pipelines],
                    "dqc_rules": [r.model_dump(mode="json") for r in bundle.dqc_rules],
                    "ontology": bundle.ontology,
                }
                logger.info("[%s] injected watchmen_context into observation", self.agent_type)
            except Exception as e:
                logger.error("[%s] failed to inject watchmen_context: %s", self.agent_type, e)

        discoveries = self.discover(observation)

        if not discoveries:
            logger.info("[%s] No discoveries, loop complete", self.agent_type)
            return []

        proposals = self.reason(discoveries)
        proposals = self.propose(proposals)
        approved = self.approve(proposals, auto_approve=auto_approve)

        if not approved:
            logger.info("[%s] No proposals approved, loop complete", self.agent_type)
            return []

        materialized = self.materialize(approved)
        self.monitor(materialized)
        self.learn(materialized)

        logger.info("[%s] Loop complete, %d proposals materialized", self.agent_type, len(materialized))
        return materialized

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _new_proposal_id(self) -> str:
        return f"prop-{self.agent_type}-{uuid4().hex[:8]}"

    def _audit(
        self,
        action: AuditAction,
        proposal_id: Optional[str] = None,
        node_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> AuditEvent:
        event = AuditEvent(
            event_id=f"evt-{uuid4().hex[:8]}",
            action=action,
            ontology_id=self.ontology.ontology_id,
            agent_type=self.agent_type,
            proposal_id=proposal_id,
            target_node_id=node_id,
            details=details or {},
        )
        self.audit_log.append(event)
        return event
