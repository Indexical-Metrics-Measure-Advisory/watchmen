from typing import List

from watchmen_model.common import EnumId, EnumItemId, OptimisticLock, TenantId, Tuple


class EnumItem(Tuple, OptimisticLock):
	itemId: EnumItemId = None
	code: str = None
	label: str = None
	parentCode: str = None
	replaceCode: str = None
	enumId: EnumId = None
	tenantId: TenantId = None


class Enum(Tuple, OptimisticLock):
	enumId: EnumId = None
	name: str = None
	description: str = None
	parentEnumId: EnumId = None
	items: List[EnumItem] = []
	tenantId: TenantId = None
