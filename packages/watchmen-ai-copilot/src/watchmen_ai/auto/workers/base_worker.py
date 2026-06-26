"""Base worker for Ontology Control Plane.

A Worker is the in-process representation of a blueprint Worker Container.
It bundles:
  - a domain OpenCodeExecutor (the CLI bundled in that container)
  - domain skills (MetadataScanner, QualityChecker, ...)
  - shared OntologyStore (Active Metastore) and LogBus (UI streaming)

Workers expose a `handle(task)` entry point consumed by the TaskQueue, and
implement the unified loop: Observe -> Discover -> Reason -> Propose ->
Approve -> Materialize -> Monitor. All stages stream logs through the bus.
"""

import logging
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from watchmen_ai.auto.core import (
    AuditAction,
    AuditEvent,
    Proposal,
    ProposalStatus,
)
from watchmen_ai.auto.executors import OpenCodeExecutor
from watchmen_ai.auto.log_bus import LogBus, LogLine
from watchmen_ai.auto.queue import Task
from watchmen_ai.auto.storage import OntologyStore

logger = logging.getLogger(__name__)


class BaseWorker(ABC):
    """Base class for all OCP workers.

    Concrete workers implement observe/discover/reason/materialize. The base
    class wires the unified loop, log streaming, audit recording, and the
    approval gate that the blueprint mandates before materialization.
    """

    worker_type: str = "base"

    def __init__(
        self,
        store: OntologyStore,
        log_bus: LogBus,
        executor: OpenCodeExecutor,
        skills: Optional[Dict[str, Any]] = None,
    ) -> None:
        self.store = store
        self.log_bus = log_bus
        self.executor = executor
        self.skills = skills or {}

    # ------------------------------------------------------------------
    # TaskQueue entry point
    # ------------------------------------------------------------------

    def handle(self, task: Task) -> Dict[str, Any]:
        """Entry point invoked by the TaskQueue.

        Reads auto_approve from task.payload, runs the unified loop, and
        returns a serializable summary.
        """
        auto_approve = task.payload.get("auto_approve", False)
        self._log(task, "info", f"[{self.worker_type}] starting loop")

        try:
            observation = self.observe(task)
            discoveries = self.discover(task, observation)
            proposals = self.reason(task, discoveries)
            self.propose(task, proposals)
            approved = self.approve(task, proposals, auto_approve=auto_approve)
            materialized = self.materialize(task, approved)
            self.monitor(task, materialized)

            self._log(task, "success",
                      f"[{self.worker_type}] loop complete: "
                      f"{len(materialized)} proposals materialized")
            return {
                "worker_type": self.worker_type,
                "discovered": len(discoveries),
                "proposed": len(proposals),
                "materialized": len(materialized),
                "proposals": [p.model_dump(mode="json") for p in materialized],
            }
        except Exception as e:
            self._log(task, "error", f"[{self.worker_type}] loop failed: {e}")
            raise

    # ------------------------------------------------------------------
    # Unified loop stages (concrete workers implement these)
    # ------------------------------------------------------------------

    @abstractmethod
    def observe(self, task: Task) -> Dict[str, Any]:
        """Pull current context. Workers typically invoke their CLI here."""

    @abstractmethod
    def discover(self, task: Task, observation: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify changes / opportunities from the observation."""

    @abstractmethod
    def reason(self, task: Task, discoveries: List[Dict[str, Any]]) -> List[Proposal]:
        """Generate proposals from discoveries."""

    @abstractmethod
    def materialize(self, task: Task, proposals: List[Proposal]) -> List[Proposal]:
        """Apply approved proposals to the ontology (via the store)."""

    # ------------------------------------------------------------------
    # Shared default behaviors
    # ------------------------------------------------------------------

    def propose(self, task: Task, proposals: List[Proposal]) -> List[Proposal]:
        """Persist proposals and audit their creation."""
        for p in proposals:
            self.store.save_proposal(p)
            self._audit(task, AuditAction.PROPOSAL_CREATED, proposal_id=p.proposal_id)
            self._log(task, "info", f"[{self.worker_type}] proposed {p.action}: {p.rationale}")
        return proposals

    def approve(self, task: Task, proposals: List[Proposal], auto_approve: bool = False) -> List[Proposal]:
        """Approval gate. High-confidence or auto_approve bypasses human review."""
        approved: List[Proposal] = []
        for p in proposals:
            if auto_approve or p.confidence >= 0.9:
                p.approve(decided_by="auto" if auto_approve else "system")
                self._audit(task, AuditAction.PROPOSAL_APPROVED, proposal_id=p.proposal_id)
                self._log(task, "info", f"[{self.worker_type}] auto-approved {p.proposal_id}")
                approved.append(p)
            else:
                self._log(task, "warn", f"[{self.worker_type}] pending human approval: {p.proposal_id}")
        return approved

    def monitor(self, task: Task, proposals: List[Proposal]) -> List[Proposal]:
        """Post-materialization validation hook."""
        for p in proposals:
            p.mark_materialized()
            self._audit(task, AuditAction.PROPOSAL_MATERIALIZED, proposal_id=p.proposal_id)
        return proposals

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _run_cli(
        self,
        task: Task,
        command: str,
        args: List[str],
        cwd: Optional[str] = None,
    ) -> Any:
        """Invoke the bundled OpenCode CLI, streaming stdout to the log bus."""
        self._log(task, "info", f"$ {command} {' '.join(args)}")
        result = self.executor.run(
            command=command,
            args=args,
            cwd=cwd,
            stream_callback=lambda line: self._log(task, "info", line),
        )
        if not result.success:
            self._log(task, "error", f"CLI failed (exit={result.exit_code})")
        return result

    def _log(self, task: Task, level: str, message: str) -> None:
        self.log_bus.publish(LogLine(
            task_id=task.task_id,
            worker_type=self.worker_type,
            level=level,
            message=message,
        ))

    def _audit(
        self,
        task: Task,
        action: AuditAction,
        proposal_id: Optional[str] = None,
        node_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> AuditEvent:
        ontology = self.store.get_ontology()
        event = AuditEvent(
            event_id=f"evt-{uuid4().hex[:8]}",
            action=action,
            ontology_id=ontology.ontology_id,
            agent_type=self.worker_type,
            proposal_id=proposal_id,
            target_node_id=node_id,
            details=details or {},
        )
        self.store.append_audit(event)
        return event

    def _new_proposal_id(self) -> str:
        return f"prop-{self.worker_type}-{uuid4().hex[:8]}"
