"""Ontology Architect Agent - discovers new business objects and relations."""

import logging
from typing import Any, Dict, List
from uuid import uuid4

from watchmen_ai.auto.agents.base import BaseOntologyAgent
from watchmen_ai.auto.core import (
    AuditAction,
    OntologyNode,
    OntologyRelation,
    Proposal,
    ProposalAction,
)

logger = logging.getLogger(__name__)


class OntologyArchitectAgent(BaseOntologyAgent):
    """Agent that discovers new business objects, relations, and attributes.

    Loop:
      1. Observe: Scan metadata (tables, topics, schemas)
      2. Discover: Identify potential new objects/relations not in ontology
      3. Reason: Generate proposals to add/update ontology
      4. Materialize: Apply changes to ontology
    """

    agent_type = "architect"

    def __init__(self, ontology, metadata_scanner=None):
        """
        Args:
            ontology: The business ontology to update
            metadata_scanner: Service that scans external metadata sources
        """
        super().__init__(ontology)
        self.metadata_scanner = metadata_scanner

    def observe(self) -> Dict[str, Any]:
        """Scan metadata sources for potential new objects."""
        logger.info("[architect] Observing metadata sources")

        if self.metadata_scanner is None:
            logger.warning("[architect] No metadata scanner configured")
            return {"tables": [], "topics": []}

        # Scan for tables and topics
        tables = self.metadata_scanner.scan_tables()
        topics = self.metadata_scanner.scan_topics()

        return {
            "tables": tables,
            "topics": topics,
            "existing_nodes": list(self.ontology.nodes.keys()),
        }

    def discover(self, observation: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Discover potential new objects from observed metadata."""
        logger.info("[architect] Discovering new objects")

        discoveries = []
        existing_nodes = set(observation.get("existing_nodes", []))

        # Check tables for potential new objects
        for table in observation.get("tables", []):
            table_name = table.get("name", "")
            # Simple heuristic: if table name doesn't match any existing node
            if not self._matches_existing_node(table_name, existing_nodes):
                discoveries.append({
                    "type": "potential_node",
                    "source": "table",
                    "name": table_name,
                    "metadata": table,
                })

        # Check topics for potential new objects
        for topic in observation.get("topics", []):
            topic_name = topic.get("name", "")
            if not self._matches_existing_node(topic_name, existing_nodes):
                discoveries.append({
                    "type": "potential_node",
                    "source": "topic",
                    "name": topic_name,
                    "metadata": topic,
                })

        logger.info("[architect] Discovered %d potential objects", len(discoveries))
        return discoveries

    def reason(self, discoveries: List[Dict[str, Any]]) -> List[Proposal]:
        """Generate proposals to add new nodes."""
        logger.info("[architect] Reasoning about discoveries")

        proposals = []
        for discovery in discoveries:
            if discovery["type"] == "potential_node":
                proposal = Proposal(
                    proposal_id=self._new_proposal_id(),
                    agent_type=self.agent_type,
                    action=ProposalAction.ADD_NODE,
                    payload={
                        "node_id": f"node-{uuid4().hex[:8]}",
                        "name": discovery["name"],
                        "description": f"Auto-discovered from {discovery['source']}",
                        "source_metadata": discovery["metadata"],
                    },
                    rationale=f"Discovered {discovery['name']} in {discovery['source']} metadata",
                    confidence=0.7,  # Moderate confidence for auto-discovery
                )
                proposals.append(proposal)

        return proposals

    def materialize(self, proposals: List[Proposal]) -> List[Proposal]:
        """Apply approved proposals to ontology."""
        logger.info("[architect] Materializing %d proposals", len(proposals))

        materialized = []
        for proposal in proposals:
            try:
                if proposal.action == ProposalAction.ADD_NODE:
                    node = OntologyNode(
                        node_id=proposal.payload["node_id"],
                        name=proposal.payload["name"],
                        description=proposal.payload.get("description"),
                    )
                    self.ontology.add_node(node)
                    self._audit(
                        AuditAction.NODE_ADDED,
                        proposal_id=proposal.proposal_id,
                        node_id=node.node_id,
                    )
                    materialized.append(proposal)

                elif proposal.action == ProposalAction.ADD_RELATION:
                    relation = OntologyRelation(
                        relation_id=proposal.payload["relation_id"],
                        source_node_id=proposal.payload["source_node_id"],
                        target_node_id=proposal.payload["target_node_id"],
                        relation_type=proposal.payload["relation_type"],
                    )
                    self.ontology.add_relation(relation)
                    self._audit(
                        AuditAction.RELATION_ADDED,
                        proposal_id=proposal.proposal_id,
                        details={"relation_id": relation.relation_id},
                    )
                    materialized.append(proposal)

            except Exception as e:
                logger.error("[architect] Failed to materialize proposal: %s", e)
                proposal.mark_failed(str(e))

        return materialized

    def _matches_existing_node(self, name: str, existing_nodes: set) -> bool:
        """Check if a name matches any existing node (fuzzy matching)."""
        name_lower = name.lower()
        for node_name in existing_nodes:
            if node_name.lower() in name_lower or name_lower in node_name.lower():
                return True
        return False
