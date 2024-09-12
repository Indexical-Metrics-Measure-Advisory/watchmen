from typing import Optional
from watchmen_utilities import ExtendedBaseModel
from watchmen_model.common import TenantBasedTuple


class PackageVersion(ExtendedBaseModel, TenantBasedTuple):
	versionId: Optional[str] = None
	preVersion: Optional[str] = None
	currVersion: Optional[str] = None
