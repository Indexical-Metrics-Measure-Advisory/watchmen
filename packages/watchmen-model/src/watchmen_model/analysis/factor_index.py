from datetime import datetime
from typing import TypeVar

from pydantic import BaseModel

from watchmen_model.admin import FactorType
from watchmen_model.common import FactorId, Storable, TenantId, TopicId

FactorIndexId = TypeVar('FactorIndexId', bound=str)


# noinspection DuplicatedCode
class FactorIndex(Storable, BaseModel):
	factorIndexId: FactorIndexId = None
	factorId: FactorId = None
	factorType: FactorType = None
	factorName: str = None
	factorLabel: str = None
	factorDescription: str = None
	topicId: TopicId = None
	topicName: str = None
	tenantId: TenantId = None
	createdAt: datetime = None
	lastModifiedAt: datetime = None
