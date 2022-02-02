from datetime import datetime
from typing import Callable, Optional

from watchmen_meta_service.admin.user import USER_ENTITY_NAME, USER_ENTITY_SHAPER
from watchmen_meta_service.system.pat import PAT_ENTITY_NAME, PAT_ENTITY_SHAPER
from watchmen_model.admin import User
from watchmen_model.system import PersonalAccessToken
from watchmen_storage import EntityCriteriaExpression, EntityFinder, EntityIdHelper, TransactionalStorageSPI
from .utils import is_blank


def redress_user(user: Optional[User], clear_pwd: bool) -> Optional[User]:
	if user is None:
		return None
	if not user.isActive:
		return None
	if clear_pwd:
		del user.password
	return user


def find_user_by_name(storage: TransactionalStorageSPI, username: str, clear_pwd: bool) -> Optional[User]:
	if is_blank(username):
		return None

	storage.begin()
	try:
		# noinspection PyTypeChecker
		user: User = storage.find_one(EntityFinder(
			name=USER_ENTITY_NAME,
			shaper=USER_ENTITY_SHAPER,
			criteria=[
				EntityCriteriaExpression(name='name', value=username)
			]
		))
		return redress_user(user, clear_pwd)
	finally:
		storage.close()


def build_find_user_by_name(
		storage: TransactionalStorageSPI, clear_pwd: bool = True
) -> Callable[[str], Optional[User]]:
	"""
	autonomous transaction inside
	"""
	return lambda username: find_user_by_name(storage, username, clear_pwd)


def find_pat_by_token(storage: TransactionalStorageSPI, pat_token: str) -> Optional[PersonalAccessToken]:
	if is_blank(pat_token):
		return None
	# noinspection PyTypeChecker
	pat: PersonalAccessToken = storage.find_one(EntityFinder(
		name=PAT_ENTITY_NAME,
		shaper=PAT_ENTITY_SHAPER,
		criteria=[
			EntityCriteriaExpression(name='token', value=pat_token)
		]
	))
	if pat is None:
		return None
	if pat.expired is None:
		# no expired date
		return pat
	if pat.expired < datetime.now().date():
		# pat is expired
		return None
	return pat


def find_user_by_pat(storage: TransactionalStorageSPI, pat_token: str) -> Optional[User]:
	"""
	find unexpired pat, find active user. Otherwise, return none
	"""

	storage.begin()
	try:
		pat = find_pat_by_token(storage, pat_token)
		if pat is None:
			return None
		# noinspection PyTypeChecker
		user: User = storage.find_by_id(pat.userId, EntityIdHelper(
			name=USER_ENTITY_NAME,
			shaper=USER_ENTITY_SHAPER,
			idColumnName='user_id'
		))
		return redress_user(user, True)
	finally:
		storage.close()


def build_find_user_by_pat(storage: TransactionalStorageSPI) -> Callable[[str], Optional[User]]:
	"""
	autonomous transaction inside
	"""
	return lambda pat_token: find_user_by_pat(storage, pat_token)
