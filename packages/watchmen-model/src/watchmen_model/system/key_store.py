from datetime import datetime
from typing import Any, Dict

from pydantic import BaseModel

from watchmen_model.common import Storable, TenantId, UserId


class KeyStore(Storable, BaseModel):
	tenantId: TenantId = None
	keyType: str = None
	params: Dict[str, Any] = None
	createdAt: datetime = None
	createdBy: UserId = None
