from typing import Dict, Optional
from watchmen_model.common import TenantId
from watchmen_utilities import ExtendedBaseModel


class LineageGraphs(ExtendedBaseModel):
	directed: Optional[bool] = None
	multigraph: Optional[bool] = None
	graph: Dict = {}
	tenantId: Optional[TenantId] = None


class LineageNodes(ExtendedBaseModel):
	id: Optional[str] = None
	name: Optional[str] = None


class LineageLinks(ExtendedBaseModel):
	pass
