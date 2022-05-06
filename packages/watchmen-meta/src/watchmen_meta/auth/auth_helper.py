from datetime import datetime
from typing import Callable, Optional

from watchmen_meta.admin.user_service import USER_ENTITY_NAME, USER_ENTITY_SHAPER
from watchmen_meta.common import ask_meta_storage
from watchmen_meta.system.pat_service import PAT_ENTITY_NAME, PAT_ENTITY_SHAPER
from watchmen_model.admin import User
from watchmen_model.system import PersonalAccessToken
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityFinder, EntityIdHelper, \
	TransactionalStorageSPI


def redress_user(user: Optional[User], clear_pwd: bool) -> Optional[User]:
	if user is None:
		return None
	if not user.isActive:
		return None
	if clear_pwd:
		del user.password
	return user


def find_user_by_name(storage: TransactionalStorageSPI, username: str, clear_pwd: bool) -> Optional[User]:
	if username is None or len(username.strip()) == 0:
		return None

	storage.begin()
	try:
		# noinspection PyTypeChecker
		user: User = storage.find_one(EntityFinder(
			name=USER_ENTITY_NAME,
			shaper=USER_ENTITY_SHAPER,
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='name'), right=username)
			]
		))
		return redress_user(user, clear_pwd)
	finally:
		storage.close()


def build_find_user_by_name(clear_pwd: bool = True) -> Callable[[str], Optional[User]]:
	"""
	autonomous transaction inside
	"""
	return lambda username: find_user_by_name(ask_meta_storage(), username, clear_pwd)


def find_pat_by_token(storage: TransactionalStorageSPI, pat_token: str) -> Optional[PersonalAccessToken]:
	if pat_token is None or len(pat_token.strip()) == 0:
		return None
	# noinspection PyTypeChecker
	pat: PersonalAccessToken = storage.find_one(EntityFinder(
		name=PAT_ENTITY_NAME,
		shaper=PAT_ENTITY_SHAPER,
		criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='token'), right=pat_token)
		]
	))
	if pat is None:
		return None
	if pat.expired is None:
		# no expired date
		return pat
	if pat.expired < datetime.now().replace(tzinfo=None):
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


def build_find_user_by_pat() -> Callable[[str], Optional[User]]:
	"""
	autonomous transaction inside
	"""
	return lambda pat_token: find_user_by_pat(ask_meta_storage(), pat_token)
