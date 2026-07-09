"""Ontology Control Plane - autonomous, evolving data infrastructure.

This package implements the DataMO Ontology Control Plane (OCP) architecture:
four OpenCode-powered CLI workers operating within a unified event loop,
evolving a centralized Business Ontology that serves as the "OS kernel"
of the data platform.

Architecture layers:
  - storage/      Active Metastore abstraction (OntologyStore; prod: Neo4j)
  - queue/        Task Coordinator abstraction (TaskQueue; prod: Redis/Celery)
  - log_bus/      Streaming log pipeline (LogBus; prod: WebSocket multiplexer)
  - executors/    OpenCode CLI executor abstraction (prod: real subprocess)
  - workers/      Worker containers (Architect, Materialization, Health, Insight)
  - orchestrator  Control Plane Core (FastAPI-side coordinator)
  - router        REST API + WebSocket endpoints

Usage:
    from watchmen_ai.auto import Orchestrator

    orch = Orchestrator()
    orch.run_full_cycle(auto_approve=True)
    ontology = orch.get_ontology()
"""

from .core import (
    AuditAction,
    AuditEvent,
    BusinessOntology,
    NodeHealth,
    OntologyAttribute,
    OntologyNode,
    OntologyRelation,
    Proposal,
    ProposalAction,
    ProposalStatus,
)
from .executors import ExecutionResult, MockOpenCodeExecutor, OpenCodeExecutor
from .log_bus import InMemoryLogBus, LogBus, LogLine
from .orchestrator import Orchestrator
from .queue import SyncTaskQueue, Task, TaskQueue, TaskStatus
from .skills import (
    MetadataScanner,
    PatternAnalyzer,
    PipelineGenerator,
    QualityChecker,
)
from .storage import InMemoryOntologyStore, OntologyStore
from .workers import (
    ArchitectWorker,
    BaseWorker,
    HealthWorker,
    InsightWorker,
    MaterializationWorker,
)

# Backwards-compatible aliases (old code that imported OntologyControlPlane
# keeps working; new code should use Orchestrator).
OntologyControlPlane = Orchestrator

__all__ = [
    # Orchestrator
    "Orchestrator",
    "OntologyControlPlane",  # backwards-compat alias
    # Workers
    "BaseWorker",
    "ArchitectWorker",
    "MaterializationWorker",
    "HealthWorker",
    "InsightWorker",
    # Infrastructure abstractions
    "OntologyStore",
    "InMemoryOntologyStore",
    "TaskQueue",
    "SyncTaskQueue",
    "Task",
    "TaskStatus",
    "LogBus",
    "InMemoryLogBus",
    "LogLine",
    "OpenCodeExecutor",
    "MockOpenCodeExecutor",
    "ExecutionResult",
    # Core Models
    "BusinessOntology",
    "OntologyNode",
    "OntologyRelation",
    "OntologyAttribute",
    "NodeHealth",
    "Proposal",
    "ProposalStatus",
    "ProposalAction",
    "AuditEvent",
    "AuditAction",
    # Skills
    "MetadataScanner",
    "QualityChecker",
    "PatternAnalyzer",
    "PipelineGenerator",
]
