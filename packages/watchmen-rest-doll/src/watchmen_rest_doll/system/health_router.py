from logging import getLogger

from fastapi import APIRouter, Response
from sqlalchemy import text
from starlette import status

from watchmen_meta.common import ask_meta_storage

logger = getLogger(__name__)

router = APIRouter()


def ping_meta_storage() -> bool:
	"""
	Run a lightweight ``SELECT 1`` against the meta storage to verify the DB is
	reachable and the connection pool is not exhausted.

	Uses the AUTOCOMMIT ``connect()`` path (read-only) and always closes the
	connection in ``finally`` so the probe itself never leaks a connection.
	"""
	storage = ask_meta_storage()
	try:
		storage.connect()
		storage.connection.execute(text("SELECT 1"))
		return True
	except Exception as e:
		logger.error(f'Health check against meta storage failed. {e}', exc_info=True)
		return False
	finally:
		storage.close()


@router.get('/health', tags=['system'])
def health(response: Response) -> dict:
	"""
	Readiness check: verifies the meta DB is reachable AND the connection pool
	can serve a connection. Returns 503 when the DB is down or the pool is
	exhausted, so k8s readiness can take the pod out of rotation.

	Lives in watchmen-rest-doll (not watchmen-rest) because reaching the meta
	storage requires a dependency on watchmen-meta.
	"""
	healthy = ping_meta_storage()
	if not healthy:
		response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
	return {"health": healthy}


@router.get('/health/db', tags=['system'])
def health_db(response: Response) -> dict:
	"""Alias for the DB-aware readiness probe. See :func:`health`."""
	healthy = ping_meta_storage()
	if not healthy:
		response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
	return {"health": healthy}
