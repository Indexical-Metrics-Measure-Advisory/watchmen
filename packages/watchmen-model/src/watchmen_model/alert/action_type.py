from typing import List, Optional

from watchmen_model.common import ActionTypeId, TenantId, UserBasedTuple
from watchmen_utilities import ExtendedBaseModel


class ActionTypeParameter(ExtendedBaseModel):
	name: str = None
	type: str = None  # 'string' | 'number' | 'boolean' | 'email' | 'url'
	required: bool = False
	description: Optional[str] = None


class ActionType(UserBasedTuple):
	actionTypeId: ActionTypeId = None
	name: str = None
	code: str = None
	description: Optional[str] = None
	requiresApproval: bool = False
	enabled: bool = True
	category: str = None
	parameters: Optional[List[ActionTypeParameter]] = None
