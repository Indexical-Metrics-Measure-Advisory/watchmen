from pydantic import BaseModel

from watchmen_model.common import TenantBasedTuple


class PackageVersion(TenantBasedTuple, BaseModel):
	versionId: str
	preVersion: str
	currVersion: str
