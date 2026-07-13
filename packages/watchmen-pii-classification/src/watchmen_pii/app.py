"""App entrypoint for the PII classification package.

Exposes a single :class:`fastapi.APIRouter` to be included by
``watchmen-rest-dqc``. This package intentionally does **not** ship its own
``RestApp`` / ``main.py`` — the DQC app is the host.
"""
from fastapi import APIRouter


def get_pii_router() -> APIRouter:
	"""Return the PII classification router.

	Use from ``watchmen-rest-dqc/main.py``::

	    from watchmen_pii.app import get_pii_router
	    app.include_router(get_pii_router())
	"""
	from .router.pii_router import router
	return router
