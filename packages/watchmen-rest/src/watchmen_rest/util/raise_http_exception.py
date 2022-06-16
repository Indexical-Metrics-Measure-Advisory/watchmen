from logging import getLogger
from typing import Any, Optional

from fastapi import HTTPException
from starlette import status

from watchmen_utilities import is_not_blank

logger = getLogger(__name__)


def log_detail(detail: Optional[Any]) -> None:
	if is_not_blank(detail):
		logger.error(detail)


def raise_400(detail: Any) -> None:
	log_detail(detail)
	raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def raise_401(detail: Any, headers: Optional[dict] = None) -> None:
	log_detail(detail)
	if headers is not None:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail, headers=headers)
	else:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


def raise_403() -> None:
	raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized visit.")


def raise_404(detail: Any = 'Data not found.') -> None:
	log_detail(detail)
	raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def raise_406(detail: Any = 'Request not acceptable.') -> None:
	log_detail(detail)
	raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail=detail)


def raise_500(e: Optional[Exception] = None, detail: Optional[Any] = 'Unpredicted exception occurred.') -> None:
	if e is not None:
		logger.error(e, exc_info=True, stack_info=True)
	log_detail(detail)

	raise HTTPException(
		status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
		detail=detail
	)
