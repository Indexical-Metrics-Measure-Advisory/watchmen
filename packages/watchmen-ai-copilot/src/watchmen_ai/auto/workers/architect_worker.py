"""Architect Worker - discovers new business objects via dataplatform-cli.

Blueprint: Worker Container 1 [OntologyArchitect]
  CLI: dataplatform-cli
  Volume: /yaml_metadata

Observe dumps platform schema to YAML, discover maps tables to business
objects, reason proposes ADD_NODE / ADD_RELATION, materialize writes them
into the ontology store.
"""

import logging
from typing import Any, Dict, List
from uuid import uuid4

from watchmen_ai.auto.core import (
    AuditAction,
    OntologyNode,
    OntologyRelation,
    Proposal,
    ProposalAction,
)
from watchmen_ai.auto.executors import OpenCodeExecutor
from watchmen_ai.auto.log_bus import LogBus
from watchmen_ai.auto.queue import Task
from watchmen_ai.auto.skills import MetadataScanner
from watchmen_ai.auto.storage import OntologyStore
from watchmen_ai.auto.workers.base_worker import BaseWorker

logger = logging.getLogger(__name__)


class ArchitectWorker(BaseWorker):
    """Worker that inspects the platform and discovers new entities."""

    worker_type = "architect"

    def __init__(
        self,
        store: OntologyStore,
        log_bus: LogBus,
        executor: OpenCodeExecutor,
        metadata_scanner: MetadataScanner,
    ) -> None:
        super().__init__(store, log_bus, executor, {"metadata_scanner": metadata_scanner})
        self.metadata_scanner = metadata_scanner

    def observe(self, task: Task) -> Dict[str, Any]:
        """Invoke dataplatform-cli to dump platform schema, then scan metadata."""
        self._run_cli(task, "dataplatform-cli", ["dump-schema", "--output", "/yaml_metadata/schema.yaml"])

        tables = self.metadata_scanner.scan_tables()
        topics = self.metadata_scanner.scan_topics()
        existing = list(self.store.get_ontology().nodes.keys())

        return {"tables": tables, "topics": topics, "existing_nodes": existing}

    def discover(self, task: Task, observation: Dict[str, Any]) -> List[Dict[str, Any]]:
        existing = set(observation.get("existing_nodes", []))
        discoveries: List[Dict[str, Any]] = []

        for table in observation.get("tables", []):
            name = table.get("name", "")
            if not self._matches_existing(name, existing):
                discoveries.append({
                    "type": "potential_node",
                    "source": "table",
                    "name": name,
                    "metadata": table,
                })

        for topic in observation.get("topics", []):
            name = topic.get("name", "")
            if not self._matches_existing(name, existing):
                discoveries.append({
                    "type": "potential_node",
                    "source": "topic",
                    "name": name,
                    "metadata": topic,
                })

        self._log(task, "info", f"[architect] discovered {len(discoveries)} potential objects")
        return discoveries

    def reason(self, task: Task, discoveries: List[Dict[str, Any]]) -> List[Proposal]:
        proposals: List[Proposal] = []
        for d in discoveries:
            if d["type"] == "potential_node":
                proposals.append(Proposal(
                    proposal_id=self._new_proposal_id(),
                    agent_type=self.worker_type,
                    action=ProposalAction.ADD_NODE,
                    payload={
                        "node_id": f"node-{uuid4().hex[:8]}",
                        "name": d["name"],
                        "description": f"Auto-discovered from {d['source']}",
                        "source_metadata": d["metadata"],
                    },
                    rationale=f"Discovered {d['name']} in {d['source']} metadata",
                    confidence=0.7,
                ))
        return proposals

    def materialize(self, task: Task, proposals: List[Proposal]) -> List[Proposal]:
        materialized: List[Proposal] = []
        for p in proposals:
            try:
                if p.action == ProposalAction.ADD_NODE:
                    node = OntologyNode(
                        node_id=p.payload["node_id"],
                        name=p.payload["name"],
                        description=p.payload.get("description"),
                    )
                    self.store.add_node(node)
                    self._audit(task, AuditAction.NODE_ADDED,
                                proposal_id=p.proposal_id, node_id=node.node_id)
                    materialized.append(p)

                elif p.action == ProposalAction.ADD_RELATION:
                    relation = OntologyRelation(
                        relation_id=p.payload["relation_id"],
                        source_node_id=p.payload["source_node_id"],
                        target_node_id=p.payload["target_node_id"],
                        relation_type=p.payload["relation_type"],
                    )
                    self.store.add_relation(relation)
                    self._audit(task, AuditAction.RELATION_ADDED,
                                proposal_id=p.proposal_id,
                                details={"relation_id": relation.relation_id})
                    materialized.append(p)
            except Exception as e:
                logger.error("[architect] materialize failed: %s", e)
                p.mark_failed(str(e))
        return materialized

    def _matches_existing(self, name: str, existing: set) -> bool:
        name_lower = name.lower()
        for n in existing:
            if n.lower() in name_lower or name_lower in n.lower():
                return True
        return False
