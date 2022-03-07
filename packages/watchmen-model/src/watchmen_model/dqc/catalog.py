from typing import List, Optional, TypeVar

from pydantic import BaseModel

from watchmen_model.common import OptimisticLock, TenantBasedTuple, TopicId, UserId

CatalogId = TypeVar('CatalogId', bound=str)


class Catalog(TenantBasedTuple, OptimisticLock, BaseModel):
	catalogId: CatalogId = None
	name: str = None
	topicIds: List[TopicId] = []
	techOwnerId: UserId = None
	bizOwnerId: UserId = None
	tags: List[str] = []
	description: str = None


class CatalogCriteria(BaseModel):
	name: Optional[str] = None
	topicId: Optional[TopicId] = None
	techOwnerId: Optional[UserId] = None
	bizOwnerId: Optional[UserId] = None
