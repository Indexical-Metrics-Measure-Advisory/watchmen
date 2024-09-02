from datetime import datetime
from typing import Any, Dict, Optional

from watchmen_utilities import ExtendedBaseModel

from watchmen_model.common import Storable, TenantId, UserId


class KeyStore(Storable, ExtendedBaseModel):
	tenantId: Optional[TenantId] = None
	keyType: Optional[str] = None
	params: Optional[Dict[str, Any]] = None
	createdAt: Optional[datetime] = None
	createdBy: Optional[UserId] = None
