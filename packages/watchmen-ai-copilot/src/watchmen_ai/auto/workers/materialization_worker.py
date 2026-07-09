"""Materialization Worker - code-gen ETL/dbt for ontology nodes.

Blueprint: Worker Container 2 [OntologyMaterializer]
  CLI: dbt-cli / git
  Volume: /dbt_project

Observe finds nodes without data sources, discover flags them, reason
proposes ADD_DATA_SOURCE, materialize invokes dbt to create the model and
registers the source on the node.
"""

import logging
from typing import Any, Dict, List

from watchmen_ai.auto.core import AuditAction, Proposal, ProposalAction
from watchmen_ai.auto.executors import OpenCodeExecutor
from watchmen_ai.auto.log_bus import LogBus
from watchmen_ai.auto.queue import Task
from watchmen_ai.auto.skills import PipelineGenerator
from watchmen_ai.auto.storage import OntologyStore
from watchmen_ai.auto.workers.base_worker import BaseWorker

logger = logging.getLogger(__name__)


class MaterializationWorker(BaseWorker):
    """Worker that generates ETL/dbt pipelines for ontology nodes."""

    worker_type = "materialization"

    def __init__(
        self,
        store: OntologyStore,
        log_bus: LogBus,
        executor: OpenCodeExecutor,
        pipeline_generator: PipelineGenerator,
        data_bridge=None,
    ) -> None:
        super().__init__(store, log_bus, executor, {"pipeline_generator": pipeline_generator}, data_bridge)
        self.pipeline_generator = pipeline_generator

    def observe(self, task: Task) -> Dict[str, Any]:
        nodes = self.store.list_nodes()
        without_sources = [
            {"node_id": n.node_id, "name": n.name}
            for n in nodes if not n.data_sources
        ]
        return {"nodes_without_sources": without_sources, "total_nodes": len(nodes)}

    def discover(self, task: Task, observation: Dict[str, Any]) -> List[Dict[str, Any]]:
        discoveries = [
            {"type": "needs_materialization", "node_id": n["node_id"], "name": n["name"]}
            for n in observation.get("nodes_without_sources", [])
        ]
        self._log(task, "info",
                  f"[materialization] {len(discoveries)} nodes need materialization")
        return discoveries

    def reason(self, task: Task, discoveries: List[Dict[str, Any]]) -> List[Proposal]:
        proposals: List[Proposal] = []
        for d in discoveries:
            proposals.append(Proposal(
                proposal_id=self._new_proposal_id(),
                agent_type=self.worker_type,
                action=ProposalAction.ADD_DATA_SOURCE,
                target_node_id=d["node_id"],
                payload={
                    "node_id": d["node_id"],
                    "pipeline_type": "dbt",
                    "source": f"auto_generated_for_{d['name']}",
                },
                rationale=f"Node {d['name']} has no data sources",
                confidence=0.8,
            ))
        return proposals

    def materialize(self, task: Task, proposals: List[Proposal]) -> List[Proposal]:
        materialized: List[Proposal] = []
        for p in proposals:
            try:
                if p.action != ProposalAction.ADD_DATA_SOURCE:
                    continue
                node_id = p.payload["node_id"]
                source = p.payload["source"]

                # Invoke dbt to code-gen the model (blueprint: dbt-cli / git)
                self._run_cli(task, "dbt", ["run", "--select", source, "--project-dir", "/dbt_project"])

                node = self.store.get_node(node_id)
                if node:
                    node.data_sources.append(source)
                    self.store.update_node(node)
                    self._audit(task, AuditAction.NODE_UPDATED,
                                proposal_id=p.proposal_id, node_id=node_id,
                                details={"data_source_added": source})
                    materialized.append(p)
            except Exception as e:
                logger.error("[materialization] failed: %s", e)
                p.mark_failed(str(e))
        return materialized
