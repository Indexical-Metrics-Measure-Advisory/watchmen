from typing import Optional

from watchmen_meta_service.admin.user import USER_ENTITY_NAME, USER_ENTITY_SHAPER
from watchmen_model.admin import User
from watchmen_storage import EntityCriteriaExpression, EntityFinder, StorageSPI


class AuthUserService:
	storage: StorageSPI

	def __init__(self, storage: StorageSPI):
		self.storage = storage

	def find_user_by_name(self, username: str) -> Optional[User]:
		return self.storage.find_one(EntityFinder(
			name=USER_ENTITY_NAME,
			shaper=USER_ENTITY_SHAPER,
			criteria=[
				EntityCriteriaExpression(name='name', value=username)
			]
		))
