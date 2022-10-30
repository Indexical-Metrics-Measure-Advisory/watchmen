from pydantic import BaseModel

from watchmen_model.common import TenantBasedTuple


class Version(TenantBasedTuple, BaseModel):
	versionId: str
	preVersion: str
	currVersion: str
