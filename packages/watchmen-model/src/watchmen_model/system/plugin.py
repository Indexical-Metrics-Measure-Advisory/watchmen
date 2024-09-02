from enum import Enum
from typing import List, Optional

from watchmen_utilities import ExtendedBaseModel
from watchmen_model.common import OptimisticLock, PluginId, TenantBasedTuple


class PluginType(str, Enum):
	STREAMLIT = 'streamlit',
	JUPYTER = 'jupyter',


class PluginApplyTo(str, Enum):
	ACHIEVEMENT = 'achievement'


class Plugin(TenantBasedTuple, OptimisticLock, ExtendedBaseModel):
	pluginId: Optional[PluginId] = None
	pluginCode: Optional[str] = None
	name: Optional[str] = None
	type: Optional[PluginType] = None
	applyTo: Optional[PluginApplyTo] = None
	# value is parameter name
	params: Optional[List[str]] = None
	# value is result name
	results: Optional[List[str]] = None
