"""Ontology Materialization Agent - materializes ontology into data pipelines."""

import logging
from typing import Any, Dict, List
from uuid import uuid4

from watchmen_ai.auto.agents.base import BaseOntologyAgent
from watchmen_ai.auto.core import AuditAction, Proposal, ProposalAction

logger = logging.getLogger(__name__)


class OntologyMaterializationAgent(BaseOntologyAgent):
    """Agent that materializes ontology nodes into actual data pipelines.

    Loop:
      1. Observe: Check which ontology nodes lack data sources
      2. Discover: Identify nodes that need materialization
      3. Reason: Generate proposals for data pipelines (CDC, ETL)
      4. Materialize: Create/update data pipelines
    """

    agent_type = "materialization"

    def __init__(self, ontology, pipeline_service=None):
        """
        Args:
            ontology: The business ontology
            pipeline_service: Service that manages data pipelines
        """
        super().__init__(ontology)
        self.pipeline_service = pipeline_service

    def observe(self) -> Dict[str, Any]:
        """Check which nodes need data sources."""
        logger.info("[materialization] Observing ontology nodes")

        nodes_without_sources = []
        for node_id, node in self.ontology.nodes.items():
            if not node.data_sources:
                nodes_without_sources.append({
                    "node_id": node_id,
                    "name": node.name,
                })

        return {
            "nodes_without_sources": nodes_without_sources,
            "total_nodes": len(self.ontology.nodes),
        }

    def discover(self, observation: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Discover nodes that need materialization."""
        logger.info("[materialization] Discovering nodes needing materialization")

        discoveries = []
        for node in observation.get("nodes_without_sources", []):
            discoveries.append({
                "type": "needs_materialization",
                "node_id": node["node_id"],
                "name": node["name"],
            })

        logger.info("[materialization] Found %d nodes needing materialization", len(discoveries))
        return discoveries

    def reason(self, discoveries: List[Dict[str, Any]]) -> List[Proposal]:
        """Generate proposals for data pipelines."""
        logger.info("[materialization] Reasoning about materialization needs")

        proposals = []
        for discovery in discoveries:
            if discovery["type"] == "needs_materialization":
                proposal = Proposal(
                    proposal_id=self._new_proposal_id(),
                    agent_type=self.agent_type,
                    action=ProposalAction.ADD_DATA_SOURCE,
                    target_node_id=discovery["node_id"],
                    payload={
                        "node_id": discovery["node_id"],
                        "pipeline_type": "etl",  # or "cdc"
                        "source": f"auto_generated_for_{discovery['name']}",
                    },
                    rationale=f"Node {discovery['name']} has no data sources",
                    confidence=0.8,
                )
                proposals.append(proposal)

        return proposals

    def materialize(self, proposals: List[Proposal]) -> List[Proposal]:
        """Create data pipelines for nodes."""
        logger.info("[materialization] Materializing %d proposals", len(proposals))

        materialized = []
        for proposal in proposals:
            try:
                if proposal.action == ProposalAction.ADD_DATA_SOURCE:
                    node_id = proposal.payload["node_id"]
                    source = proposal.payload["source"]

                    # Add data source to node
                    node = self.ontology.get_node(node_id)
                    if node:
                        node.data_sources.append(source)
                        node.updated_at = node.updated_at  # Trigger update timestamp

                        self._audit(
                            AuditAction.NODE_UPDATED,
                            proposal_id=proposal.proposal_id,
                            node_id=node_id,
                            details={"data_source_added": source},
                        )

                        # TODO: Actually create pipeline via pipeline_service
                        if self.pipeline_service:
                            logger.info(
                                "[materialization] Would create pipeline for %s -> %s",
                                node.name,
                                source,
                            )

                        materialized.append(proposal)

            except Exception as e:
                logger.error("[materialization] Failed to materialize: %s", e)
                proposal.mark_failed(str(e))

        return materialized
