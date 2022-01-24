from typing import List

from watchmen.model.common import EnumId, EnumItemId, TenantId, Tuple


class EnumItem(Tuple):
	itemId: EnumItemId = None
	code: str = None
	label: str = None
	parentCode: str = None
	replaceCode: str = None
	enumId: EnumId = None
	tenantId: TenantId = None


class Enum(Tuple):
	enumId: EnumId = None
	name: str = None
	description: str = None
	parentEnumId: EnumId = None
	items: List[EnumItem] = []
	tenantId: TenantId = None
