"""Insight Worker - analyzes query logs and synthesizes semantic tags.

Blueprint: Worker Container 4 [OntologyInsight]
  CLI: cube-cli / Query Log
  Volume: /warehouse_logs

Observe analyzes warehouse query logs via cube-cli, discover identifies
emerging business concepts, reason proposes ADD_NODE (segments), materialize
adds them to the ontology.
"""

import logging
from typing import Any, Dict, List
from uuid import uuid4

from watchmen_ai.auto.core import AuditAction, OntologyNode, Proposal, ProposalAction
from watchmen_ai.auto.executors import OpenCodeExecutor
from watchmen_ai.auto.log_bus import LogBus
from watchmen_ai.auto.queue import Task
from watchmen_ai.auto.skills import PatternAnalyzer
from watchmen_ai.auto.storage import OntologyStore
from watchmen_ai.auto.workers.base_worker import BaseWorker

logger = logging.getLogger(__name__)


class InsightWorker(BaseWorker):
    """Worker that discovers business insights and new concepts."""

    worker_type = "insight"

    def __init__(
        self,
        store: OntologyStore,
        log_bus: LogBus,
        executor: OpenCodeExecutor,
        pattern_analyzer: PatternAnalyzer,
    ) -> None:
        super().__init__(store, log_bus, executor, {"pattern_analyzer": pattern_analyzer})
        self.pattern_analyzer = pattern_analyzer

    def observe(self, task: Task) -> Dict[str, Any]:
        # Invoke cube-cli to analyze warehouse query logs
        self._run_cli(task, "cube-cli", ["analyze", "--logs", "/warehouse_logs", "--output", "tags"])

        patterns = self.pattern_analyzer.analyze_patterns()
        existing_segments = [
            n for n in self.store.list_nodes() if n.node_type == "segment"
        ]
        return {"patterns": patterns, "existing_segments": existing_segments}

    def discover(self, task: Task, observation: Dict[str, Any]) -> List[Dict[str, Any]]:
        existing_names = {s.name.lower() for s in observation.get("existing_segments", [])}
        discoveries: List[Dict[str, Any]] = []
        for pattern in observation.get("patterns", []):
            name = pattern.get("name", "")
            if name.lower() not in existing_names:
                discoveries.append({
                    "type": "new_concept",
                    "name": name,
                    "description": pattern.get("description", ""),
                    "pattern_data": pattern,
                    "confidence": pattern.get("confidence", 0.5),
                })
        self._log(task, "info", f"[insight] discovered {len(discoveries)} new concepts")
        return discoveries

    def reason(self, task: Task, discoveries: List[Dict[str, Any]]) -> List[Proposal]:
        proposals: List[Proposal] = []
        for d in discoveries:
            proposals.append(Proposal(
                proposal_id=self._new_proposal_id(),
                agent_type=self.worker_type,
                action=ProposalAction.ADD_NODE,
                payload={
                    "node_id": f"segment-{uuid4().hex[:8]}",
                    "name": d["name"],
                    "description": d["description"],
                    "node_type": "segment",
                    "pattern_data": d["pattern_data"],
                },
                rationale=f"Discovered business concept: {d['name']}",
                confidence=d["confidence"],
            ))
        return proposals

    def materialize(self, task: Task, proposals: List[Proposal]) -> List[Proposal]:
        materialized: List[Proposal] = []
        for p in proposals:
            try:
                if p.action != ProposalAction.ADD_NODE:
                    continue
                node = OntologyNode(
                    node_id=p.payload["node_id"],
                    name=p.payload["name"],
                    description=p.payload.get("description"),
                    node_type=p.payload.get("node_type", "segment"),
                )
                pattern_data = p.payload.get("pattern_data", {})
                for key, value in pattern_data.items():
                    if key not in ["name", "description", "confidence"]:
                        node.add_attribute(key, str(value))

                self.store.add_node(node)
                self._audit(task, AuditAction.NODE_ADDED,
                            proposal_id=p.proposal_id, node_id=node.node_id)
                materialized.append(p)
            except Exception as e:
                logger.error("[insight] materialize failed: %s", e)
                p.mark_failed(str(e))
        return materialized
