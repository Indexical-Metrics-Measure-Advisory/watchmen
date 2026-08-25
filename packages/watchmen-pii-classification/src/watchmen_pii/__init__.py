"""watchmen-pii-classification — PII data classification platform.

Business-term driven sensitive-data discovery and lineage impact analysis.
Discovery is logic matching (FactorType + keyword) within the topics a term
is linked to, plus manual factor mapping; lineage (both directions) is
implemented in this package on top of the pipeline metadata. Exposes an
``APIRouter`` mounted under ``/dqc/pii`` for ``watchmen-rest-dqc`` to
include.

Public surface:
* :func:`get_pii_router` — the HTTP router to include in the DQC app.
* Models, services and seed loader for direct programmatic use.
"""
from .app import get_pii_router

__all__ = ["get_pii_router"]

__version__ = "18.0.0"
