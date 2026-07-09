"""OCP Orchestrator - the FastAPI-side coordinator.

Blueprint layer: Control Plane Core (FastAPI). The orchestrator:
  - owns the shared OntologyStore (Active Metastore) and LogBus
  - registers workers with the TaskQueue (Task Coordinator)
  - exposes high-level operations: run_full_cycle, run_worker, approve_proposal
  - aggregates audit log and pending proposals from the store

Workers are never called directly; all execution flows through the queue so
the same code path works for sync dev mode and Redis/Celery production.
"""

import logging
from typing import Any, Dict, List, Optional

from watchmen_ai.auto.context_bridge import WatchmenDataBridge
from watchmen_ai.auto.executors import MockOpenCodeExecutor, OpenCodeExecutor
from watchmen_ai.auto.log_bus import InMemoryLogBus, LogBus
from watchmen_ai.auto.queue import SyncTaskQueue, Task, TaskQueue
from watchmen_ai.auto.skills import (
    MetadataScanner,
    PatternAnalyzer,
    PipelineGenerator,
    QualityChecker,
)
from watchmen_ai.auto.storage import InMemoryOntologyStore, OntologyStore
from watchmen_ai.auto.workers import (
    ArchitectWorker,
    HealthWorker,
    InsightWorker,
    MaterializationWorker,
)

logger = logging.getLogger(__name__)


class Orchestrator:
    """Central coordinator for the Ontology Control Plane.

    Wires the blueprint layers together:
      Control Plane Core (this) -> Task Coordinator (queue) -> Worker Containers
      Active Metastore (store) <-> workers
      Log Bus (this) -> UI WebSocket stream
    """

    def __init__(
        self,
        store: Optional[OntologyStore] = None,
        queue: Optional[TaskQueue] = None,
        log_bus: Optional[LogBus] = None,
        executor: Optional[OpenCodeExecutor] = None,
        metadata_scanner: Optional[MetadataScanner] = None,
        quality_checker: Optional[QualityChecker] = None,
        pattern_analyzer: Optional[PatternAnalyzer] = None,
        pipeline_generator: Optional[PipelineGenerator] = None,
        data_bridge: Optional[WatchmenDataBridge] = None,
    ) -> None:
        # --- Shared infrastructure (blueprint cross-cutting layers) ---
        self.store = store or InMemoryOntologyStore()
        self.queue = queue or SyncTaskQueue()
        self.log_bus = log_bus or InMemoryLogBus()
        self.executor = executor or MockOpenCodeExecutor()
        self.data_bridge = data_bridge

        # --- Skills (injected into workers) ---
        self.metadata_scanner = metadata_scanner or MetadataScanner(
            config={"demo_mode": True}, data_bridge=self.data_bridge
        )
        self.quality_checker = quality_checker or QualityChecker()
        self.pattern_analyzer = pattern_analyzer or PatternAnalyzer()
        self.pipeline_generator = pipeline_generator or PipelineGenerator()

        # --- Workers (blueprint: one per container) ---
        self.workers: Dict[str, Any] = {
            "architect": ArchitectWorker(
                self.store, self.log_bus, self.executor, self.metadata_scanner, self.data_bridge),
            "materialization": MaterializationWorker(
                self.store, self.log_bus, self.executor, self.pipeline_generator, self.data_bridge),
            "health": HealthWorker(
                self.store, self.log_bus, self.executor, self.quality_checker, self.data_bridge),
            "insight": InsightWorker(
                self.store, self.log_bus, self.executor, self.pattern_analyzer, self.data_bridge),
        }

        # Register worker handlers with the task queue
        for worker_type, worker in self.workers.items():
            self.queue.register_worker(worker_type, worker.handle)

        logger.info("OCP Orchestrator initialized with 4 workers")

    # ------------------------------------------------------------------
    # High-level operations
    # ------------------------------------------------------------------

    def run_full_cycle(self, auto_approve: bool = False) -> Dict[str, Any]:
        """Run all four workers in order: Architect -> Materialization -> Health -> Insight.

        Mirrors the blueprint's closed-loop evolution cycle. Each phase
        enqueues a task and waits for its result (sync queue) before the
        next phase starts, so materialization sees newly discovered nodes.
        """
        logger.info("Starting full ontology evolution cycle")
        results: Dict[str, Any] = {}

        for worker_type in ["architect", "materialization", "health", "insight"]:
            task = self.queue.enqueue(worker_type, {"auto_approve": auto_approve})
            results[worker_type] = task.result if task.status.value == "success" else {"error": task.error}

        total_materialized = sum(
            r.get("materialized", 0) for r in results.values() if isinstance(r, dict)
        )
        logger.info("Full cycle complete: %d proposals materialized", total_materialized)
        return results

    def run_worker(self, worker_type: str, auto_approve: bool = False) -> Dict[str, Any]:
        """Enqueue a single worker task and return its result."""
        if worker_type not in self.workers:
            raise ValueError(f"Unknown worker type: {worker_type}")
        task = self.queue.enqueue(worker_type, {"auto_approve": auto_approve})
        if task.status.value == "success":
            return task.result
        raise RuntimeError(task.error or f"Worker {worker_type} failed")

    def approve_proposal(self, proposal_id: str, approved: bool, reason: str = "") -> bool:
        """Manually approve or reject a pending proposal (human-in-the-loop)."""
        proposal = self.store.get_proposal(proposal_id)
        if proposal is None or proposal.status != "pending":
            return False
        if approved:
            proposal.approve(decided_by="user", notes=reason)
        else:
            proposal.reject(decided_by="user", notes=reason)
        self.store.save_proposal(proposal)
        return True

    # ------------------------------------------------------------------
    # Read accessors for the REST layer
    # ------------------------------------------------------------------

    def get_ontology(self):
        return self.store.get_ontology()

    def get_pending_proposals(self) -> List[Dict[str, Any]]:
        return [
            {
                "proposal_id": p.proposal_id,
                "agent_type": p.agent_type,
                "action": p.action,
                "rationale": p.rationale,
                "confidence": p.confidence,
                "created_at": p.created_at.isoformat(),
            }
            for p in self.store.list_pending_proposals()
        ]

    def get_audit_log(self) -> List[Dict[str, Any]]:
        return [
            {
                "event_id": e.event_id,
                "action": e.action,
                "agent_type": e.agent_type,
                "timestamp": e.timestamp.isoformat(),
                "details": e.details,
            }
            for e in self.store.list_audit()
        ]

    def get_tasks(self, worker_type: Optional[str] = None) -> List[Dict[str, Any]]:
        return [
            {
                "task_id": t.task_id,
                "worker_type": t.worker_type,
                "status": t.status.value,
                "created_at": t.created_at.isoformat(),
                "finished_at": t.finished_at.isoformat() if t.finished_at else None,
                "error": t.error,
            }
            for t in self.queue.list_tasks(worker_type)
        ]

    def get_logs(self, task_id: Optional[str] = None) -> List[Dict[str, Any]]:
        return [
            {
                "log_id": l.log_id,
                "task_id": l.task_id,
                "worker_type": l.worker_type,
                "level": l.level,
                "message": l.message,
                "timestamp": l.timestamp.isoformat(),
            }
            for l in self.log_bus.history(task_id)
        ]

    def refresh_context(self) -> Dict[str, Any]:
        """Manually refresh Watchmen Data Bridge context (human-in-the-loop or scheduled)."""
        if self.data_bridge is None:
            return {"status": "skipped", "reason": "data_bridge not configured"}
        bundle = self.data_bridge.refresh_context()
        return {
            "status": "refreshed",
            "topics": len(bundle.topics),
            "pipelines": len(bundle.pipelines),
            "dqc_rules": len(bundle.dqc_rules),
            "fetched_at": bundle.fetched_at.isoformat(),
        }

    def list_workers(self) -> List[Dict[str, str]]:
        return [
            {"type": wt, "class": type(w).__name__}
            for wt, w in self.workers.items()
        ]
