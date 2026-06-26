"""Task queue abstraction layer for Ontology Control Plane.

Blueprint layer: Task Coordinator (Redis + Celery / Celery Beat).
This abstraction lets workers be invoked synchronously in dev mode or
asynchronously via Redis/Celery in production without changing call sites.
"""

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional
from uuid import uuid4

logger = logging.getLogger(__name__)


class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"


@dataclass
class Task:
    """A unit of work dispatched to a worker container (blueprint)."""
    task_id: str = field(default_factory=lambda: f"task-{uuid4().hex[:8]}")
    worker_type: str = ""                 # architect | materialization | health | insight
    payload: Dict[str, Any] = field(default_factory=dict)
    status: TaskStatus = TaskStatus.PENDING
    result: Optional[Any] = None
    error: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None

    def mark_running(self) -> None:
        self.status = TaskStatus.RUNNING
        self.started_at = datetime.utcnow()

    def mark_success(self, result: Any = None) -> None:
        self.status = TaskStatus.SUCCESS
        self.result = result
        self.finished_at = datetime.utcnow()

    def mark_failed(self, error: str) -> None:
        self.status = TaskStatus.FAILED
        self.error = error
        self.finished_at = datetime.utcnow()


class TaskQueue(ABC):
    """Abstraction over the task coordinator layer.

    Production: Redis-backed Celery queue distributed across Docker worker
    containers. Development: synchronous in-process execution.
    """

    @abstractmethod
    def enqueue(self, worker_type: str, payload: Dict[str, Any]) -> Task:
        """Submit a task to the queue. Returns the created Task."""

    @abstractmethod
    def get_task(self, task_id: str) -> Optional[Task]:
        """Poll task status (used by the REST API and dashboard)."""

    @abstractmethod
    def list_tasks(self, worker_type: Optional[str] = None) -> List[Task]:
        """List tasks, optionally filtered by worker type."""

    @abstractmethod
    def register_worker(self, worker_type: str, handler: Callable[[Task], Any]) -> None:
        """Bind a handler function to a worker type."""


class SyncTaskQueue(TaskQueue):
    """Synchronous queue for dev/tests.

    Executes the registered handler immediately on enqueue, which mirrors
    how a Celery worker would process the task. Swap for RedisTaskQueue
    in production without changing orchestrator code.
    """

    def __init__(self) -> None:
        self._handlers: Dict[str, Callable[[Task], Any]] = {}
        self._tasks: Dict[str, Task] = {}

    def register_worker(self, worker_type: str, handler: Callable[[Task], Any]) -> None:
        self._handlers[worker_type] = handler

    def enqueue(self, worker_type: str, payload: Dict[str, Any]) -> Task:
        if worker_type not in self._handlers:
            raise ValueError(f"No worker registered for type: {worker_type}")

        task = Task(worker_type=worker_type, payload=payload)
        self._tasks[task.task_id] = task

        handler = self._handlers[worker_type]
        task.mark_running()
        try:
            result = handler(task)
            task.mark_success(result=result)
        except Exception as e:
            logger.exception("Task %s failed", task.task_id)
            task.mark_failed(str(e))

        return task

    def get_task(self, task_id: str) -> Optional[Task]:
        return self._tasks.get(task_id)

    def list_tasks(self, worker_type: Optional[str] = None) -> List[Task]:
        if worker_type is None:
            return list(self._tasks.values())
        return [t for t in self._tasks.values() if t.worker_type == worker_type]
