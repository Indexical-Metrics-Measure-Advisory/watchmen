"""Health Worker - runs DQ profilers and calculates node health scores.

Blueprint: Worker Container 3 [OntologyHealth]
  CLI: soda-core-cli / DQ
  Volume: /dq_rules

Observe runs soda-core profilers, discover flags nodes with significant
score drift, reason proposes UPDATE_HEALTH, materialize writes the new
health metrics onto the node.
"""

import logging
from typing import Any, Dict, List

from watchmen_ai.auto.core import (
    AuditAction,
    NodeHealth,
    Proposal,
    ProposalAction,
)
from watchmen_ai.auto.executors import OpenCodeExecutor
from watchmen_ai.auto.log_bus import LogBus
from watchmen_ai.auto.queue import Task
from watchmen_ai.auto.skills import QualityChecker
from watchmen_ai.auto.storage import OntologyStore
from watchmen_ai.auto.workers.base_worker import BaseWorker

logger = logging.getLogger(__name__)


class HealthWorker(BaseWorker):
    """Worker that monitors ontology node health via DQ profilers."""

    worker_type = "health"

    def __init__(
        self,
        store: OntologyStore,
        log_bus: LogBus,
        executor: OpenCodeExecutor,
        quality_checker: QualityChecker,
    ) -> None:
        super().__init__(store, log_bus, executor, {"quality_checker": quality_checker})
        self.quality_checker = quality_checker

    def observe(self, task: Task) -> Dict[str, Any]:
        # Invoke soda-core to run profilers (blueprint: soda-core-cli)
        self._run_cli(task, "soda-core", ["scan", "-d", "warehouse", "-c", "/dq_rules/rules.yml"])

        node_health_data = []
        for node in self.store.list_nodes():
            metrics = self.quality_checker.check_quality(node)
            node_health_data.append({
                "node_id": node.node_id,
                "name": node.name,
                "metrics": metrics,
                "current_health": node.health,
            })
        return {"node_health_data": node_health_data}

    def discover(self, task: Task, observation: Dict[str, Any]) -> List[Dict[str, Any]]:
        discoveries: List[Dict[str, Any]] = []
        for data in observation.get("node_health_data", []):
            metrics = data["metrics"]
            current = data["current_health"]

            new_health = NodeHealth(
                completeness=metrics.get("completeness", 100.0),
                freshness=metrics.get("freshness", 100.0),
                uniqueness=metrics.get("uniqueness", 100.0),
                consistency=metrics.get("consistency", 100.0),
            )
            new_health.compute_overall()

            needs_update = (
                current is None
                or abs(current.overall_score - new_health.overall_score) > 5.0
            )
            if needs_update:
                discoveries.append({
                    "type": "health_update_needed",
                    "node_id": data["node_id"],
                    "name": data["name"],
                    "new_health": new_health,
                    "old_score": current.overall_score if current else None,
                    "new_score": new_health.overall_score,
                })
        self._log(task, "info", f"[health] {len(discoveries)} nodes need health updates")
        return discoveries

    def reason(self, task: Task, discoveries: List[Dict[str, Any]]) -> List[Proposal]:
        proposals: List[Proposal] = []
        for d in discoveries:
            proposals.append(Proposal(
                proposal_id=self._new_proposal_id(),
                agent_type=self.worker_type,
                action=ProposalAction.UPDATE_HEALTH,
                target_node_id=d["node_id"],
                payload={
                    "node_id": d["node_id"],
                    "health": d["new_health"].model_dump(mode="json"),
                },
                rationale=(f"Health score changed from {d['old_score'] or 'N/A'} "
                           f"to {d['new_score']:.1f}"),
                confidence=0.95,
            ))
        return proposals

    def materialize(self, task: Task, proposals: List[Proposal]) -> List[Proposal]:
        materialized: List[Proposal] = []
        for p in proposals:
            try:
                if p.action != ProposalAction.UPDATE_HEALTH:
                    continue
                node_id = p.payload["node_id"]
                node = self.store.get_node(node_id)
                if node:
                    health = NodeHealth(**p.payload["health"])
                    node.update_health(health)
                    self.store.update_node(node)
                    self._audit(task, AuditAction.HEALTH_UPDATED,
                                proposal_id=p.proposal_id, node_id=node_id,
                                details={"new_score": health.overall_score})
                    materialized.append(p)
            except Exception as e:
                logger.error("[health] materialize failed: %s", e)
                p.mark_failed(str(e))
        return materialized
