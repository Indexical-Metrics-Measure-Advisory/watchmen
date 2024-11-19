from typing import List, Optional, TypeVar

from watchmen_utilities import ExtendedBaseModel

from watchmen_model.common import OptimisticLock, TenantBasedTuple, TopicId, UserId

CatalogId = TypeVar('CatalogId', bound=str)


class Catalog(TenantBasedTuple, OptimisticLock, ExtendedBaseModel):
	catalogId: CatalogId = None
	name: str = None
	topicIds: Optional[List[TopicId]] = []
	techOwnerId: UserId = None
	bizOwnerId: UserId = None
	tags: Optional[List[str]] = []
	description: str = None


class CatalogCriteria(ExtendedBaseModel):
	name: Optional[str] = None
	topicId: Optional[TopicId] = None
	techOwnerId: Optional[UserId] = None
	bizOwnerId: Optional[UserId] = None
