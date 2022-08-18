from enum import Enum
from typing import List

from pydantic import BaseModel

from watchmen_model.common import OptimisticLock, PluginId, TenantBasedTuple


class PluginType(str, Enum):
	STREAMLIT = 'streamlit',
	JUPYTER = 'jupyter',


class PluginApplyTo(str, Enum):
	ACHIEVEMENT = 'achievement'


class Plugin(TenantBasedTuple, OptimisticLock, BaseModel):
	pluginId: PluginId = None
	pluginCode: str = None
	name: str = None
	type: PluginType = None
	applyTo: PluginApplyTo = None
	# value is parameter name
	params: List[str] = None
	# value is result name
	results: List[str] = None
