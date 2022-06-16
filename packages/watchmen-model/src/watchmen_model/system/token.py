from datetime import datetime

from pydantic import BaseModel

from watchmen_model.common import PatId, TenantId, UserBasedTuple


class Token(BaseModel):
	accessToken: str
	tokenType: str
	role: str
	tenantId: TenantId = None


class PersonalAccessToken(UserBasedTuple, BaseModel):
	patId: PatId = None
	token: str = None
	username: str = None
	note: str = None
	expired: datetime = None
	permissions: list = None
	createdAt: datetime = None
