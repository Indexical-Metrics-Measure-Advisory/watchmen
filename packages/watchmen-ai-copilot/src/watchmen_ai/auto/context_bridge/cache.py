"""Cache abstraction and in-memory TTL implementation for context fragments."""

import logging
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)


class ContextCache(ABC):
    """Abstract cache for storing formatted context text."""

    @abstractmethod
    def get(self, key: str) -> Optional[str]:
        """Retrieve cached context text. Returns None if missing or expired."""
        ...

    @abstractmethod
    def set(self, key: str, value: str, ttl_seconds: int = 300) -> None:
        """Store context text with a TTL."""
        ...

    @abstractmethod
    def invalidate(self, key: str) -> None:
        """Remove a specific key from the cache."""
        ...

    @abstractmethod
    def invalidate_all(self) -> None:
        """Clear the entire cache."""
        ...


class InMemoryContextCache(ContextCache):
    """Simple dict-based TTL cache suitable for single-process dev and testing.

    Cache key convention: ``{tenant_id}:{context_type}:{param_hash}``
    """

    def __init__(self) -> None:
        self._store: dict[str, tuple[str, datetime]] = {}

    def get(self, key: str) -> Optional[str]:
        entry = self._store.get(key)
        if entry is None:
            return None
        value, expires_at = entry
        if datetime.utcnow() > expires_at:
            self._store.pop(key, None)
            return None
        return value

    def set(self, key: str, value: str, ttl_seconds: int = 300) -> None:
        expires_at = datetime.utcnow() + timedelta(seconds=ttl_seconds)
        self._store[key] = (value, expires_at)
        logger.debug("Cached context key=%s ttl=%ds", key, ttl_seconds)

    def invalidate(self, key: str) -> None:
        self._store.pop(key, None)
        logger.debug("Invalidated context key=%s", key)

    def invalidate_all(self) -> None:
        self._store.clear()
        logger.debug("Cleared all cached context")
