from datetime import datetime
from typing import Optional

from watchmen_utilities import ExtendedBaseModel

from watchmen_model.common import PatId, TenantId, UserBasedTuple


class Token(ExtendedBaseModel):
	accessToken: str
	tokenType: str
	role: str
	tenantId: Optional[TenantId] = None


class PersonalAccessToken(UserBasedTuple, ExtendedBaseModel):
	patId: Optional[PatId] = None
	token: Optional[str] = None
	username: Optional[str] = None
	note: Optional[str] = None
	expired: Optional[datetime] = None
	permissions: Optional[list] = None
	createdAt: Optional[datetime] = None
