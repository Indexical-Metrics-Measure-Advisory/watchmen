from typing import Dict, List, Optional, Union

from watchmen_utilities import ExtendedBaseModel

from watchmen_model.common import EnumId, EnumItemId, OptimisticLock, Storable, TenantBasedTuple, TenantId
from watchmen_utilities import ArrayHelper


class EnumItem(ExtendedBaseModel, Storable):
	itemId: Optional[EnumItemId] = None
	code: Optional[str] = None
	label: Optional[str] = None
	parentCode: Optional[str] = None
	replaceCode: Optional[str] = None
	enumId: Optional[EnumId] = None
	tenantId: Optional[TenantId] = None


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


class Enum(ExtendedBaseModel, TenantBasedTuple, OptimisticLock):
	enumId: Optional[EnumId] = None
	name: Optional[str] = None
	description: Optional[str] = None
	parentEnumId: Optional[EnumId] = None
	items: Optional[List[EnumItem]] = []

	def __setattr__(self, name, value):
		if name == 'items':
			super().__setattr__(name, construct_items(value))
		else:
			super().__setattr__(name, value)
