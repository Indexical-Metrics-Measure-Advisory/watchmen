"""Ontology Health Agent - monitors and maintains ontology health."""

import logging
from typing import Any, Dict, List
from datetime import datetime

from watchmen_ai.auto.agents.base import BaseOntologyAgent
from watchmen_ai.auto.core import AuditAction, NodeHealth, Proposal, ProposalAction

logger = logging.getLogger(__name__)


class OntologyHealthAgent(BaseOntologyAgent):
    """Agent that monitors ontology node health and quality.

    Loop:
      1. Observe: Check data quality metrics for each node
      2. Discover: Identify nodes with health issues
      3. Reason: Generate proposals to update health scores
      4. Materialize: Update node health metrics
    """

    agent_type = "health"

    def __init__(self, ontology, quality_checker=None):
        """
        Args:
            ontology: The business ontology
            quality_checker: Service that checks data quality
        """
        super().__init__(ontology)
        self.quality_checker = quality_checker

    def observe(self) -> Dict[str, Any]:
        """Check data quality for all nodes."""
        logger.info("[health] Observing node health")

        node_health_data = []
        for node_id, node in self.ontology.nodes.items():
            # Check quality metrics
            if self.quality_checker:
                metrics = self.quality_checker.check_quality(node)
            else:
                # Default metrics if no checker
                metrics = {
                    "completeness": 100.0,
                    "freshness": 100.0,
                    "uniqueness": 100.0,
                    "consistency": 100.0,
                }

            node_health_data.append({
                "node_id": node_id,
                "name": node.name,
                "metrics": metrics,
                "current_health": node.health,
            })

        return {"node_health_data": node_health_data}

    def discover(self, observation: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Discover nodes with health issues."""
        logger.info("[health] Discovering health issues")

        discoveries = []
        for data in observation.get("node_health_data", []):
            metrics = data["metrics"]
            current_health = data["current_health"]

            # Calculate new health
            new_health = NodeHealth(
                completeness=metrics.get("completeness", 100.0),
                freshness=metrics.get("freshness", 100.0),
                uniqueness=metrics.get("uniqueness", 100.0),
                consistency=metrics.get("consistency", 100.0),
            )
            new_health.compute_overall()

            # Check if health changed significantly
            needs_update = False
            if current_health is None:
                needs_update = True
            elif abs(current_health.overall_score - new_health.overall_score) > 5.0:
                needs_update = True

            if needs_update:
                discoveries.append({
                    "type": "health_update_needed",
                    "node_id": data["node_id"],
                    "name": data["name"],
                    "new_health": new_health,
                    "old_score": current_health.overall_score if current_health else None,
                    "new_score": new_health.overall_score,
                })

        logger.info("[health] Found %d nodes needing health updates", len(discoveries))
        return discoveries

    def reason(self, discoveries: List[Dict[str, Any]]) -> List[Proposal]:
        """Generate proposals to update health scores."""
        logger.info("[health] Reasoning about health updates")

        proposals = []
        for discovery in discoveries:
            if discovery["type"] == "health_update_needed":
                proposal = Proposal(
                    proposal_id=self._new_proposal_id(),
                    agent_type=self.agent_type,
                    action=ProposalAction.UPDATE_HEALTH,
                    target_node_id=discovery["node_id"],
                    payload={
                        "node_id": discovery["node_id"],
                        "health": discovery["new_health"].dict(),
                    },
                    rationale=(
                        f"Health score changed from {discovery['old_score'] or 'N/A'} "
                        f"to {discovery['new_score']:.1f}"
                    ),
                    confidence=0.95,  # High confidence for objective metrics
                )
                proposals.append(proposal)

        return proposals

    def materialize(self, proposals: List[Proposal]) -> List[Proposal]:
        """Update node health metrics."""
        logger.info("[health] Materializing %d health updates", len(proposals))

        materialized = []
        for proposal in proposals:
            try:
                if proposal.action == ProposalAction.UPDATE_HEALTH:
                    node_id = proposal.payload["node_id"]
                    health_data = proposal.payload["health"]

                    node = self.ontology.get_node(node_id)
                    if node:
                        health = NodeHealth(**health_data)
                        node.update_health(health)

                        self._audit(
                            AuditAction.HEALTH_UPDATED,
                            proposal_id=proposal.proposal_id,
                            node_id=node_id,
                            details={
                                "old_score": node.health.overall_score if node.health else None,
                                "new_score": health.overall_score,
                            },
                        )

                        materialized.append(proposal)

            except Exception as e:
                logger.error("[health] Failed to update health: %s", e)
                proposal.mark_failed(str(e))

        return materialized
