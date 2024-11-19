from datetime import datetime
from typing import TypeVar, Optional

from watchmen_model.admin import FactorType
from watchmen_model.common import FactorId, Storable, TenantId, TopicId
from watchmen_utilities import ExtendedBaseModel

FactorIndexId = TypeVar('FactorIndexId', bound=str)


# noinspection DuplicatedCode
class FactorIndex(ExtendedBaseModel, Storable):
	factorIndexId: Optional[FactorIndexId] = None
	factorId: Optional[FactorId] = None
	factorType: Optional[FactorType] = None
	factorName: Optional[str] = None
	factorLabel: Optional[str] = None
	factorDescription: Optional[str] = None
	topicId: Optional[TopicId] = None
	topicName: Optional[str] = None
	tenantId: Optional[TenantId] = None
	createdAt: Optional[datetime] = None
	lastModifiedAt: Optional[datetime] = None
