from typing import Dict

from pydantic import BaseModel

from watchmen_model.common import TenantBasedTuple


class ChangeDataJson(TenantBasedTuple, BaseModel):
	changeJsonId: str
	resourceId: str
	modelName: str
	objectId: str
	content: Dict
	dependOn: Dict
	tableTriggerId: str
	modelTriggerId: str
	eventTriggerId: str
