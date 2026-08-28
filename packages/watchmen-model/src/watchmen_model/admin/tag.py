from enum import Enum
from typing import Optional

from watchmen_utilities import ExtendedBaseModel

from watchmen_model.common import OptimisticLock, TagId, TenantBasedTuple


class TagType(str, Enum):
	TOPIC = 'topic'
	SUBJECT = 'subject'
	INDICATOR = 'indicator'


class Tag(ExtendedBaseModel, TenantBasedTuple, OptimisticLock):
	tagId: Optional[TagId] = None
	name: Optional[str] = None
	type: Optional[TagType] = None
	description: Optional[str] = None
