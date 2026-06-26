"""Ontology Control Plane - unified orchestration for all ontology agents.

This is the main entry point that coordinates the four ontology agents:
- Architect Agent: discovers new business objects
- Materialization Agent: materializes ontology into data pipelines
- Health Agent: monitors and maintains ontology health
- Insight Agent: discovers business insights and concepts
"""

import logging
from typing import Any, Dict, List, Optional
from uuid import uuid4

from watchmen_ai.auto.agents import (
    OntologyArchitectAgent,
    OntologyHealthAgent,
    OntologyInsightAgent,
    OntologyMaterializationAgent,
)
from watchmen_ai.auto.core import BusinessOntology, Proposal
from watchmen_ai.auto.skills import (
    MetadataScanner,
    PatternAnalyzer,
    PipelineGenerator,
    QualityChecker,
)

logger = logging.getLogger(__name__)


class OntologyControlPlane:
    """Unified control plane for ontology evolution.

    Orchestrates the four ontology agents in a coordinated loop:
    1. Architect discovers new objects
    2. Materialization creates data pipelines
    3. Health monitors quality
    4. Insight discovers patterns

    The control plane maintains:
    - Business Ontology: the unified object model
    - Decision Store: governance decisions
    - Audit Store: all changes for traceability
    - Skill Library: reusable capabilities
    - Governance Workflow: approval processes
    """

    def __init__(
        self,
        ontology: Optional[BusinessOntology] = None,
        metadata_scanner: Optional[MetadataScanner] = None,
        quality_checker: Optional[QualityChecker] = None,
        pattern_analyzer: Optional[PatternAnalyzer] = None,
        pipeline_generator: Optional[PipelineGenerator] = None,
    ):
        """Initialize the control plane.

        Args:
            ontology: The business ontology to manage (creates empty one if None)
            metadata_scanner: Skill for scanning metadata sources
            quality_checker: Skill for checking data quality
            pattern_analyzer: Skill for analyzing patterns
            pipeline_generator: Skill for generating pipelines
        """
        # Initialize or use provided ontology
        self.ontology = ontology or BusinessOntology(
            ontology_id=f"ont-{uuid4().hex[:8]}",
            name="Default Ontology",
            description="Auto-generated business ontology",
        )

        # Initialize skills
        self.metadata_scanner = metadata_scanner or MetadataScanner()
        self.quality_checker = quality_checker or QualityChecker()
        self.pattern_analyzer = pattern_analyzer or PatternAnalyzer()
        self.pipeline_generator = pipeline_generator or PipelineGenerator()

        # Initialize agents
        self.architect = OntologyArchitectAgent(self.ontology, self.metadata_scanner)
        self.materialization = OntologyMaterializationAgent(self.ontology, self.pipeline_generator)
        self.health = OntologyHealthAgent(self.ontology, self.quality_checker)
        self.insight = OntologyInsightAgent(self.ontology, self.pattern_analyzer)

        # Decision and audit stores
        self.decision_store: List[Dict[str, Any]] = []
        self.audit_store: List[Dict[str, Any]] = []

        logger.info("Ontology Control Plane initialized")

    def run_full_cycle(self, auto_approve: bool = False) -> Dict[str, List[Proposal]]:
        """Run a full cycle of all agents in order.

        Args:
            auto_approve: If True, automatically approve proposals with high confidence

        Returns:
            Dict mapping agent type to list of materialized proposals
        """
        logger.info("Starting full ontology evolution cycle")

        results = {}

        # 1. Architect discovers new objects
        logger.info("Phase 1: Architect Agent")
        architect_proposals = self.architect.run(auto_approve=auto_approve)
        results["architect"] = architect_proposals
        self._record_decisions("architect", architect_proposals)
        self._record_audit("architect")

        # 2. Materialization creates pipelines for new objects
        logger.info("Phase 2: Materialization Agent")
        materialization_proposals = self.materialization.run(auto_approve=auto_approve)
        results["materialization"] = materialization_proposals
        self._record_decisions("materialization", materialization_proposals)
        self._record_audit("materialization")

        # 3. Health monitors quality
        logger.info("Phase 3: Health Agent")
        health_proposals = self.health.run(auto_approve=auto_approve)
        results["health"] = health_proposals
        self._record_decisions("health", health_proposals)
        self._record_audit("health")

        # 4. Insight discovers patterns
        logger.info("Phase 4: Insight Agent")
        insight_proposals = self.insight.run(auto_approve=auto_approve)
        results["insight"] = insight_proposals
        self._record_decisions("insight", insight_proposals)
        self._record_audit("insight")

        total_proposals = sum(len(p) for p in results.values())
        logger.info("Full cycle complete: %d proposals materialized", total_proposals)

        return results

    def run_agent(self, agent_type: str, auto_approve: bool = False) -> List[Proposal]:
        """Run a specific agent.

        Args:
            agent_type: One of "architect", "materialization", "health", "insight"
            auto_approve: If True, automatically approve high-confidence proposals

        Returns:
            List of materialized proposals
        """
        agents = {
            "architect": self.architect,
            "materialization": self.materialization,
            "health": self.health,
            "insight": self.insight,
        }

        if agent_type not in agents:
            raise ValueError(f"Unknown agent type: {agent_type}")

        agent = agents[agent_type]
        proposals = agent.run(auto_approve=auto_approve)

        self._record_decisions(agent_type, proposals)
        self._record_audit(agent_type)

        return proposals

    def get_ontology(self) -> BusinessOntology:
        """Get the current business ontology."""
        return self.ontology

    def get_audit_log(self) -> List[Dict[str, Any]]:
        """Get the complete audit log from all agents."""
        all_audit = []
        for agent in [self.architect, self.materialization, self.health, self.insight]:
            all_audit.extend([
                {
                    "event_id": event.event_id,
                    "action": event.action,
                    "timestamp": event.timestamp.isoformat(),
                    "details": event.details,
                }
                for event in agent.audit_log
            ])
        return sorted(all_audit, key=lambda x: x["timestamp"])

    def get_pending_proposals(self) -> List[Dict[str, Any]]:
        """Get all pending proposals from all agents."""
        pending = []
        for agent in [self.architect, self.materialization, self.health, self.insight]:
            pending.extend([
                {
                    "proposal_id": p.proposal_id,
                    "agent_type": p.agent_type,
                    "action": p.action,
                    "rationale": p.rationale,
                    "confidence": p.confidence,
                    "created_at": p.created_at.isoformat(),
                }
                for p in agent.pending_proposals
                if p.status == "pending"
            ])
        return pending

    def approve_proposal(self, proposal_id: str, approved: bool, reason: str = "") -> bool:
        """Manually approve or reject a pending proposal.

        Args:
            proposal_id: The proposal ID
            approved: True to approve, False to reject
            reason: Reason for the decision

        Returns:
            True if proposal was found and updated
        """
        for agent in [self.architect, self.materialization, self.health, self.insight]:
            for proposal in agent.pending_proposals:
                if proposal.proposal_id == proposal_id and proposal.status == "pending":
                    if approved:
                        proposal.approve(decided_by="user", notes=reason)
                    else:
                        proposal.reject(decided_by="user", notes=reason)

                    self.decision_store.append({
                        "proposal_id": proposal_id,
                        "approved": approved,
                        "reason": reason,
                        "decided_at": proposal.decided_at.isoformat() if proposal.decided_at else None,
                    })

                    return True

        return False

    def _record_decisions(self, agent_type: str, proposals: List[Proposal]) -> None:
        """Record decisions for proposals."""
        for proposal in proposals:
            if proposal.status in ["approved", "materialized"]:
                self.decision_store.append({
                    "proposal_id": proposal.proposal_id,
                    "agent_type": agent_type,
                    "action": proposal.action,
                    "status": proposal.status,
                    "confidence": proposal.confidence,
                    "decided_at": proposal.decided_at.isoformat() if proposal.decided_at else None,
                })

    def _record_audit(self, agent_type: str) -> None:
        """Record audit events from an agent."""
        agent = getattr(self, agent_type)
        for event in agent.audit_log:
            self.audit_store.append({
                "event_id": event.event_id,
                "action": event.action,
                "timestamp": event.timestamp.isoformat(),
                "details": event.details,
            })
