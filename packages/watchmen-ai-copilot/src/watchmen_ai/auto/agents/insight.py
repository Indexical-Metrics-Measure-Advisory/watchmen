"""Ontology Insight Agent - discovers business insights and new concepts."""

import logging
from typing import Any, Dict, List
from uuid import uuid4

from watchmen_ai.auto.agents.base import BaseOntologyAgent
from watchmen_ai.auto.core import AuditAction, OntologyNode, Proposal, ProposalAction

logger = logging.getLogger(__name__)


class OntologyInsightAgent(BaseOntologyAgent):
    """Agent that discovers business insights and new concepts.

    Loop:
      1. Observe: Analyze data patterns and business metrics
      2. Discover: Identify emerging business concepts
      3. Reason: Generate proposals for new segments/concepts
      4. Materialize: Add new concepts to ontology
    """

    agent_type = "insight"

    def __init__(self, ontology, pattern_analyzer=None):
        """
        Args:
            ontology: The business ontology
            pattern_analyzer: Service that analyzes data patterns
        """
        super().__init__(ontology)
        self.pattern_analyzer = pattern_analyzer

    def observe(self) -> Dict[str, Any]:
        """Analyze data patterns and metrics."""
        logger.info("[insight] Observing data patterns")

        if self.pattern_analyzer is None:
            logger.warning("[insight] No pattern analyzer configured")
            return {"patterns": []}

        patterns = self.pattern_analyzer.analyze_patterns()

        return {
            "patterns": patterns,
            "existing_segments": [
                n for n in self.ontology.nodes.values()
                if n.node_type == "segment"
            ],
        }

    def discover(self, observation: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Discover emerging business concepts from patterns."""
        logger.info("[insight] Discovering business concepts")

        discoveries = []
        existing_segments = observation.get("existing_segments", [])
        existing_names = {s.name.lower() for s in existing_segments}

        for pattern in observation.get("patterns", []):
            pattern_name = pattern.get("name", "")

            # Check if this is a new concept
            if pattern_name.lower() not in existing_names:
                discoveries.append({
                    "type": "new_concept",
                    "name": pattern_name,
                    "description": pattern.get("description", ""),
                    "pattern_data": pattern,
                    "confidence": pattern.get("confidence", 0.5),
                })

        logger.info("[insight] Discovered %d new concepts", len(discoveries))
        return discoveries

    def reason(self, discoveries: List[Dict[str, Any]]) -> List[Proposal]:
        """Generate proposals for new business concepts."""
        logger.info("[insight] Reasoning about new concepts")

        proposals = []
        for discovery in discoveries:
            if discovery["type"] == "new_concept":
                proposal = Proposal(
                    proposal_id=self._new_proposal_id(),
                    agent_type=self.agent_type,
                    action=ProposalAction.ADD_NODE,
                    payload={
                        "node_id": f"segment-{uuid4().hex[:8]}",
                        "name": discovery["name"],
                        "description": discovery["description"],
                        "node_type": "segment",
                        "pattern_data": discovery["pattern_data"],
                    },
                    rationale=f"Discovered business concept: {discovery['name']}",
                    confidence=discovery["confidence"],
                )
                proposals.append(proposal)

        return proposals

    def materialize(self, proposals: List[Proposal]) -> List[Proposal]:
        """Add new business concepts to ontology."""
        logger.info("[insight] Materializing %d new concepts", len(proposals))

        materialized = []
        for proposal in proposals:
            try:
                if proposal.action == ProposalAction.ADD_NODE:
                    node = OntologyNode(
                        node_id=proposal.payload["node_id"],
                        name=proposal.payload["name"],
                        description=proposal.payload.get("description"),
                        node_type=proposal.payload.get("node_type", "segment"),
                    )

                    # Add pattern data as attributes
                    pattern_data = proposal.payload.get("pattern_data", {})
                    for key, value in pattern_data.items():
                        if key not in ["name", "description", "confidence"]:
                            node.add_attribute(key, str(value))

                    self.ontology.add_node(node)
                    self._audit(
                        AuditAction.NODE_ADDED,
                        proposal_id=proposal.proposal_id,
                        node_id=node.node_id,
                    )

                    materialized.append(proposal)

            except Exception as e:
                logger.error("[insight] Failed to materialize concept: %s", e)
                proposal.mark_failed(str(e))

        return materialized
