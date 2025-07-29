from typing import Dict, List, Optional

from watchmen_utilities import ExtendedBaseModel

from watchmen_model.common import TenantBasedTuple, Storable


class Dependence(Storable, ExtendedBaseModel):
	modelName: Optional[str] = None
	objectId: Optional[str] = None


class ChangeDataJson(TenantBasedTuple, ExtendedBaseModel):
	changeJsonId: Optional[int] = None
	resourceId: Optional[str] = None
	modelName: Optional[str] = None
	objectId: Optional[str] = None
	sequence: Optional[int] = None
	tableName: Optional[str] = None
	content: Optional[Dict] = None
	dataId: Optional[Dict] = None
	dependOn: Optional[List[Dependence]] = None
	isPosted: Optional[bool] = None
	status: Optional[int] = None
	result: Optional[Dict] = None
	taskId: Optional[int] = None
	tableTriggerId: Optional[int] = None
	modelTriggerId: Optional[int] = None
	moduleTriggerId: Optional[int] = None
	eventTriggerId: Optional[int] = None

