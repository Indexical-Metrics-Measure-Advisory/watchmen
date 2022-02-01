from pydantic import BaseModel

from watchmen_model.common import TenantId


class Token(BaseModel):
	accessToken: str
	tokenType: str
	role: str
	tenantId: TenantId = None
