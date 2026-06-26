"""Storage abstraction layer for Ontology Control Plane.

The OntologyStore decouples agents/workers from the underlying storage.
Production implementations can use Neo4j (graph) or RDS (relational),
while in-memory implementation supports local development and tests.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional

from watchmen_ai.auto.core import (
    AuditEvent,
    BusinessOntology,
    OntologyNode,
    OntologyRelation,
    Proposal,
)


class OntologyStore(ABC):
    """Abstraction over the Active Metastore (blueprint layer: Active Metastore).

    In production this is backed by Neo4j: nodes as vertices, lineage as edges,
    DQ rules and health scores as node properties.
    """

    @abstractmethod
    def get_ontology(self) -> BusinessOntology:
        """Pull the full current ontology (kernel context for workers)."""

    @abstractmethod
    def save_ontology(self, ontology: BusinessOntology) -> None:
        """Persist the full ontology state."""

    @abstractmethod
    def add_node(self, node: OntologyNode) -> None:
        """Add a new business object to the ontology."""

    @abstractmethod
    def update_node(self, node: OntologyNode) -> None:
        """Update an existing business object."""

    @abstractmethod
    def get_node(self, node_id: str) -> Optional[OntologyNode]:
        """Fetch a single node by id."""

    @abstractmethod
    def add_relation(self, relation: OntologyRelation) -> None:
        """Add a lineage edge between two nodes."""

    @abstractmethod
    def list_nodes(self) -> List[OntologyNode]:
        """Return all nodes (for worker observation)."""

    @abstractmethod
    def list_pending_proposals(self) -> List[Proposal]:
        """Return all proposals awaiting human approval."""

    @abstractmethod
    def save_proposal(self, proposal: Proposal) -> None:
        """Upsert a proposal (pending / approved / materialized)."""

    @abstractmethod
    def get_proposal(self, proposal_id: str) -> Optional[Proposal]:
        """Fetch a proposal by id."""

    @abstractmethod
    def append_audit(self, event: AuditEvent) -> None:
        """Append to the audit/decision store."""

    @abstractmethod
    def list_audit(self) -> List[AuditEvent]:
        """Return the full audit trail."""


class InMemoryOntologyStore(OntologyStore):
    """Default in-memory store for development and tests.

    Holds a single BusinessOntology instance plus proposal and audit logs.
    Swap for Neo4jOntologyStore in production without touching workers.
    """

    def __init__(self, ontology: Optional[BusinessOntology] = None) -> None:
        self._ontology = ontology or BusinessOntology(
            ontology_id="default",
            name="Default Ontology",
            description="In-memory default ontology",
        )
        self._proposals: Dict[str, Proposal] = {}
        self._audit: List[AuditEvent] = []

    def get_ontology(self) -> BusinessOntology:
        return self._ontology

    def save_ontology(self, ontology: BusinessOntology) -> None:
        self._ontology = ontology

    def add_node(self, node: OntologyNode) -> None:
        self._ontology.add_node(node)

    def update_node(self, node: OntologyNode) -> None:
        self._ontology.nodes[node.node_id] = node
        from datetime import datetime
        node.updated_at = datetime.utcnow()
        self._ontology.updated_at = datetime.utcnow()
        self._ontology.version += 1

    def get_node(self, node_id: str) -> Optional[OntologyNode]:
        return self._ontology.nodes.get(node_id)

    def add_relation(self, relation: OntologyRelation) -> None:
        self._ontology.add_relation(relation)

    def list_nodes(self) -> List[OntologyNode]:
        return list(self._ontology.nodes.values())

    def list_pending_proposals(self) -> List[Proposal]:
        return [p for p in self._proposals.values() if p.status == "pending"]

    def save_proposal(self, proposal: Proposal) -> None:
        self._proposals[proposal.proposal_id] = proposal

    def get_proposal(self, proposal_id: str) -> Optional[Proposal]:
        return self._proposals.get(proposal_id)

    def append_audit(self, event: AuditEvent) -> None:
        self._audit.append(event)

    def list_audit(self) -> List[AuditEvent]:
        return list(self._audit)
