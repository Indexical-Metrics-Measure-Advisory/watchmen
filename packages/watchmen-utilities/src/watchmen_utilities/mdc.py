import contextvars
from typing import Dict, Optional

# define contextvar store MDC context(key-value pair), default empty dict
_mdc_context: contextvars.ContextVar[Dict[str, str]] = contextvars.ContextVar(
    "mdc_context", default={}
)


def mdc_put(key: str, value: str) -> None:
    current = _mdc_context.get()
    current[key] = value
    _mdc_context.set(current)


def mdc_get(key: str) -> Optional[str]:
    return _mdc_context.get().get(key)


def mdc_remove(key: str) -> None:
    current = _mdc_context.get()
    current.pop(key, None)
    _mdc_context.set(current)


def mdc_clear() -> None:
    _mdc_context.set({})