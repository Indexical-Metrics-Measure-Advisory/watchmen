from typing import Dict, List, Optional, Union

from pydantic import BaseModel

from watchmen_model.common import EnumId, EnumItemId, OptimisticLock, Storable, TenantBasedTuple, TenantId
from watchmen_utilities import ArrayHelper


class EnumItem(Storable, BaseModel):
	itemId: EnumItemId = None
	code: str = None
	label: str = None
	parentCode: str = None
	replaceCode: str = None
	enumId: EnumId = None
	tenantId: TenantId = None


def construct_item(item: Union[EnumItem, Dict]) -> Optional[EnumItem]:
	if item is None:
		return None
	elif isinstance(item, EnumItem):
		return item
	else:
		return EnumItem(**item)


def construct_items(items: Optional[List[Union[EnumItem, Dict]]]) -> Optional[List[EnumItem]]:
	if items is None:
		return None
	else:
		return ArrayHelper(items).map(lambda x: construct_item(x)).to_list()


class Enum(TenantBasedTuple, OptimisticLock, BaseModel):
	enumId: EnumId = None
	name: str = None
	description: str = None
	parentEnumId: EnumId = None
	items: List[EnumItem] = []

	def __setattr__(self, name, value):
		if name == 'items':
			super().__setattr__(name, construct_items(value))
		else:
			super().__setattr__(name, value)
