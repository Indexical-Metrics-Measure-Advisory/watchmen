"""Storage abstraction layer."""

from .ontology_store import InMemoryOntologyStore, OntologyStore

__all__ = ["OntologyStore", "InMemoryOntologyStore"]
