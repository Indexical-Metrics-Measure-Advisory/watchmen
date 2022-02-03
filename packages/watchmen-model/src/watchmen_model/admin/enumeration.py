from typing import List

from pydantic import BaseModel

from watchmen_model.common import EnumId, EnumItemId, OptimisticLock, TenantBasedTuple


class EnumItem(TenantBasedTuple, OptimisticLock, BaseModel):
	itemId: EnumItemId = None
	code: str = None
	label: str = None
	parentCode: str = None
	replaceCode: str = None
	enumId: EnumId = None


class Enum(TenantBasedTuple, OptimisticLock, BaseModel):
	enumId: EnumId = None
	name: str = None
	description: str = None
	parentEnumId: EnumId = None
	items: List[EnumItem] = []
