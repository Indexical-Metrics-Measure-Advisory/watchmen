from typing import Callable, Optional

from watchmen_meta_service.admin.user import USER_ENTITY_NAME, USER_ENTITY_SHAPER
from watchmen_model.admin import User
from watchmen_storage import EntityCriteriaExpression, EntityFinder, StorageSPI


def build_find_user_by_name(storage: StorageSPI) -> Callable[[str], Optional[User]]:
	return lambda username: storage.find_one(EntityFinder(
		name=USER_ENTITY_NAME,
		shaper=USER_ENTITY_SHAPER,
		criteria=[
			EntityCriteriaExpression(name='name', value=username)
		]
	))
