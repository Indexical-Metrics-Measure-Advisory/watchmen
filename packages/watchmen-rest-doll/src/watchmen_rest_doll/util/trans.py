from logging import getLogger
from typing import Callable, Tuple, TypeVar

from fastapi import HTTPException

from watchmen_meta.common import StorageService
from watchmen_rest.util import raise_500

logger = getLogger(__name__)
TransReturned = TypeVar('TransReturned')


def trans_readonly(storage_service: StorageService, action: Callable[[], TransReturned]) -> TransReturned:
	storage_service.begin_transaction()
	try:
		return action()
	except HTTPException as e:
		raise e
	except Exception as e:
		raise_500(e)
	finally:
		storage_service.close_transaction()


# noinspection DuplicatedCode
def trans_with_fail_over(
		storage_service: StorageService, action: Callable[[], TransReturned], fail_over: Callable[[], TransReturned]
) -> TransReturned:
	storage_service.begin_transaction()
	try:
		returned = action()
		storage_service.commit_transaction()
		return returned
	except HTTPException as e:
		logger.error(e, exc_info=True, stack_info=True)
		storage_service.rollback_transaction()
		return fail_over()
	except Exception as e:
		logger.error(e, exc_info=True, stack_info=True)
		storage_service.rollback_transaction()
		return fail_over()


# noinspection DuplicatedCode
def trans(storage_service: StorageService, action: Callable[[], TransReturned]) -> TransReturned:
	storage_service.begin_transaction()
	try:
		returned = action()
		storage_service.commit_transaction()
		return returned
	except HTTPException as e:
		storage_service.rollback_transaction()
		raise e
	except Exception as e:
		storage_service.rollback_transaction()
		raise_500(e)


def trans_with_tail(
		storage_service: StorageService,
		action: Callable[[], Tuple[TransReturned, Callable[[], None]]]) -> TransReturned:
	storage_service.begin_transaction()
	try:
		returned, tail = action()
		storage_service.commit_transaction()
	except HTTPException as e:
		storage_service.rollback_transaction()
		raise e
	except Exception as e:
		storage_service.rollback_transaction()
		raise_500(e)
	else:
		tail()
		return returned
