"""Business Ontology model - the kernel of the data team's operating system."""

from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class NodeHealth(BaseModel):
    """Health metrics for an ontology node."""
    completeness: float = Field(ge=0, le=100, description="Data completeness percentage")
    freshness: float = Field(ge=0, le=100, description="Data freshness percentage")
    uniqueness: float = Field(ge=0, le=100, description="Data uniqueness percentage")
    consistency: float = Field(ge=0, le=100, description="Data consistency percentage")
    overall_score: float = Field(default=0.0, ge=0, le=100, description="Overall health score")
    last_checked: datetime = Field(default_factory=datetime.utcnow)

    def compute_overall(self) -> float:
        """Compute overall score as weighted average."""
        self.overall_score = (
            self.completeness * 0.3 +
            self.freshness * 0.3 +
            self.uniqueness * 0.2 +
            self.consistency * 0.2
        )
        return self.overall_score


class OntologyAttribute(BaseModel):
    """An attribute of an ontology node (e.g., quality rules, metrics)."""
    name: str
    value: str
    attribute_type: str = "string"  # string, number, boolean, json
    source: Optional[str] = None  # Where this attribute came from
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class OntologyNode(BaseModel):
    """A business object in the ontology (e.g., Customer, Campaign, Coupon)."""
    node_id: str
    name: str
    description: Optional[str] = None
    node_type: str = "business_object"  # business_object, concept, segment
    attributes: Dict[str, OntologyAttribute] = Field(default_factory=dict)
    health: Optional[NodeHealth] = None
    data_sources: List[str] = Field(default_factory=list)  # Table/topic IDs
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    version: int = 1

    def add_attribute(self, name: str, value: str, attr_type: str = "string") -> None:
        """Add or update an attribute."""
        self.attributes[name] = OntologyAttribute(
            name=name, value=value, attribute_type=attr_type
        )
        self.updated_at = datetime.utcnow()

    def update_health(self, health: NodeHealth) -> None:
        """Update health metrics."""
        health.compute_overall()
        self.health = health
        self.updated_at = datetime.utcnow()


class OntologyRelation(BaseModel):
    """A relationship between two ontology nodes."""
    relation_id: str
    source_node_id: str
    target_node_id: str
    relation_type: str  # e.g., "uses", "participates_in", "belongs_to"
    description: Optional[str] = None
    properties: Dict[str, str] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class BusinessOntology(BaseModel):
    """The Business Ontology - unified object model for the data team."""
    ontology_id: str
    name: str
    description: Optional[str] = None
    nodes: Dict[str, OntologyNode] = Field(default_factory=dict)
    relations: Dict[str, OntologyRelation] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    version: int = 1

    def add_node(self, node: OntologyNode) -> None:
        """Add a node to the ontology."""
        self.nodes[node.node_id] = node
        self.updated_at = datetime.utcnow()
        self.version += 1

    def get_node(self, node_id: str) -> Optional[OntologyNode]:
        """Get a node by ID."""
        return self.nodes.get(node_id)

    def find_node_by_name(self, name: str) -> Optional[OntologyNode]:
        """Find a node by name (case-insensitive)."""
        name_lower = name.lower()
        for node in self.nodes.values():
            if node.name.lower() == name_lower:
                return node
        return None

    def add_relation(self, relation: OntologyRelation) -> None:
        """Add a relation to the ontology."""
        self.relations[relation.relation_id] = relation
        self.updated_at = datetime.utcnow()
        self.version += 1

    def get_relations_for_node(self, node_id: str) -> List[OntologyRelation]:
        """Get all relations involving a node."""
        return [
            r for r in self.relations.values()
            if r.source_node_id == node_id or r.target_node_id == node_id
        ]
