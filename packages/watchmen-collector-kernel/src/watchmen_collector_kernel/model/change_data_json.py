from typing import Dict, List

from pydantic import BaseModel

from watchmen_model.common import TenantBasedTuple, Storable


class Dependence(Storable, BaseModel):
	modelName: str
	objectId: str


class ChangeDataJson(TenantBasedTuple, BaseModel):
	changeJsonId: int
	resourceId: str
	modelName: str
	objectId: str
	sequence: int
	content: Dict
	dataId: Dict
	dependOn: List[Dependence]
	isPosted: bool
	status: int
	result: Dict
	taskId: int
	tableTriggerId: int
	modelTriggerId: int
	moduleTriggerId: int
	eventTriggerId: int

