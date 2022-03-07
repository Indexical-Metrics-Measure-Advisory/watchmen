from typing import List, TypeVar

from watchmen_model.common import TenantBasedTuple, TopicId, UserId

CatalogId = TypeVar('CatalogId', bound=str)


class Catalog(TenantBasedTuple):
	catalogId: CatalogId = None
	name: str = None
	topicIds: List[TopicId] = []
	techOwnerId: UserId = None
	bizOwnerId: UserId = None
	tags: List[str] = []
	description: str = None
