from datetime import date, datetime

from pydantic import BaseModel

from watchmen_model.common import PatId, Storable, TenantId, UserId


class Token(BaseModel):
	accessToken: str
	tokenType: str
	role: str
	tenantId: TenantId = None


class PersonalAccessToken(BaseModel, Storable):
	patId: str = PatId
	token: str = None
	userId: UserId = None
	username: str = None
	tenantId: TenantId = None
	note: str = None
	expired: date = None
	permissions: list = None
	createdAt: datetime = None
