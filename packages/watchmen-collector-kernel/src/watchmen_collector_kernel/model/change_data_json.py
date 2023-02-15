from typing import Dict, List

from pydantic import BaseModel

from watchmen_model.common import TenantBasedTuple
from .scheduled_task import Dependence


class ChangeDataJson(TenantBasedTuple, BaseModel):
	changeJsonId: str
	resourceId: str
	modelName: str
	objectId: str
	sequence: str
	content: Dict
	dependOn: List[Dependence]
	isPosted: bool
	result: str
	tableTriggerId: str
	modelTriggerId: str
	eventTriggerId: str
