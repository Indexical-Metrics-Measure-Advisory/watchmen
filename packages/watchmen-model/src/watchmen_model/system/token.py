from datetime import date

from pydantic import BaseModel

from watchmen_model.common import TenantId, UserId


class Token(BaseModel):
	accessToken: str
	tokenType: str
	role: str
	tenantId: TenantId = None


class PersonalAccessToken(BaseModel):
	patId: str = None
	token: str = None
	userId: UserId = None
	username: str = None
	tenantId: TenantId = None
	note: str = None
	expired: date = None
	permissions: list = None
