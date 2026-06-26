"""Log bus abstraction layer for Ontology Control Plane.

Blueprint layer: UI Presentation (React + Xterm.js via WebSocket streams).
Workers emit structured log lines through the bus; the orchestrator and REST
layer subscribe and forward to WebSocket clients for real-time terminal output.
"""

import logging
from abc import ABC, abstractmethod
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from typing import Callable, Dict, List, Optional
from uuid import uuid4

logger = logging.getLogger(__name__)


@dataclass
class LogLine:
    """One terminal line emitted by a worker's OpenCode CLI stream."""
    log_id: str = field(default_factory=lambda: f"log-{uuid4().hex[:8]}")
    task_id: Optional[str] = None
    worker_type: str = ""
    level: str = "info"            # info | warn | error | success
    message: str = ""
    timestamp: datetime = field(default_factory=datetime.utcnow)


# A subscriber receives LogLine instances.
LogSubscriber = Callable[[LogLine], None]


class LogBus(ABC):
    """Abstraction over the streaming log pipeline.

    Production: Redis Pub/Sub or WebSocket multiplexer. Development: in-memory
    fan-out to registered subscribers.
    """

    @abstractmethod
    def publish(self, line: LogLine) -> None:
        """Publish a log line to all subscribers."""

    @abstractmethod
    def subscribe(self, subscriber: LogSubscriber, task_id: Optional[str] = None) -> str:
        """Subscribe to log lines. If task_id given, only receive that task's logs."""

    @abstractmethod
    def unsubscribe(self, sub_id: str) -> None:
        """Remove a subscription."""

    @abstractmethod
    def history(self, task_id: Optional[str] = None) -> List[LogLine]:
        """Return historical log lines (used for log viewer preload)."""


class InMemoryLogBus(LogBus):
    """In-memory pub/sub log bus with per-task filtering and history."""

    def __init__(self) -> None:
        self._subscribers: Dict[str, tuple[LogSubscriber, Optional[str]]] = {}
        self._history: List[LogLine] = []

    def publish(self, line: LogLine) -> None:
        self._history.append(line)
        for sub_id, (fn, filter_task_id) in list(self._subscribers.items()):
            if filter_task_id is None or filter_task_id == line.task_id:
                try:
                    fn(line)
                except Exception:
                    logger.exception("Log subscriber %s failed", sub_id)

    def subscribe(self, subscriber: LogSubscriber, task_id: Optional[str] = None) -> str:
        sub_id = f"sub-{uuid4().hex[:8]}"
        self._subscribers[sub_id] = (subscriber, task_id)
        return sub_id

    def unsubscribe(self, sub_id: str) -> None:
        self._subscribers.pop(sub_id, None)

    def history(self, task_id: Optional[str] = None) -> List[LogLine]:
        if task_id is None:
            return list(self._history)
        return [l for l in self._history if l.task_id == task_id]
