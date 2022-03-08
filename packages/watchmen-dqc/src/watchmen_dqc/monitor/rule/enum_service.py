from typing import Dict

from watchmen_meta.admin import EnumItemService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.common import EnumId
from watchmen_utilities import ArrayHelper


def get_enum_item_service() -> EnumItemService:
	return EnumItemService(ask_meta_storage(), ask_snowflake_generator())


class EnumService:
	cache: Dict[EnumId, Dict[str, bool]] = {}

	def clear(self):
		self.cache = {}

	def exists(self, enum_id: EnumId, code: str) -> bool:
		if enum_id in self.cache:
			return code in self.cache[enum_id]
		else:
			items = get_enum_item_service().find_by_enum_id(enum_id)
			self.cache[enum_id] = ArrayHelper(items).to_map(lambda x: x.code, lambda x: True)
			return self.exists(enum_id, code)


enum_service = EnumService()
