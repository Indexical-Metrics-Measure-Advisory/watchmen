from typing import Optional
from watchmen_utilities import ExtendedBaseModel
from watchmen_model.common import TenantBasedTuple


class PackageVersion(TenantBasedTuple, ExtendedBaseModel):
	versionId: Optional[str]
	preVersion: Optional[str]
	currVersion: Optional[str]
