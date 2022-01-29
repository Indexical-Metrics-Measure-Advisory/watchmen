from typing import List

from watchmen_model.common import EnumId, EnumItemId, OptimisticLock, TenantBasedTuple


class EnumItem(TenantBasedTuple, OptimisticLock):
	itemId: EnumItemId = None
	code: str = None
	label: str = None
	parentCode: str = None
	replaceCode: str = None
	enumId: EnumId = None


class Enum(TenantBasedTuple, OptimisticLock):
	enumId: EnumId = None
	name: str = None
	description: str = None
	parentEnumId: EnumId = None
	items: List[EnumItem] = []
