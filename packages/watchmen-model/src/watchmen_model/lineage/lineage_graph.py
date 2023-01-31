from typing import Dict

from pydantic import BaseModel

from watchmen_model.common import TenantId
from watchmen_model.system import tenant


class LineageGraphs(BaseModel):
	directed:bool = None
	multigraph:bool = None
	graph:Dict = {}
	tenantId : TenantId = None


class LineageNodes(BaseModel):
	id:str = None
	name:str = None
	pass


class LineageLinks(BaseModel):



	pass