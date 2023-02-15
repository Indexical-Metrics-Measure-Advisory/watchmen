from typing import List

from pydantic import BaseModel

from .condition import Condition, construct_conditions
from watchmen_model.common import TenantBasedTuple, OptimisticLock


class CollectorPluginConfig(TenantBasedTuple, OptimisticLock, BaseModel):
	pluginId: str = None
	name: str = None
	tableName: str = None
	primaryKey: List[str] = None
	conditions: List[Condition] = None
	dataSourceId: str = None

	def __setattr__(self, name, value):
		if name == 'conditions':
			super().__setattr__(name, construct_conditions(value))
		else:
			super().__setattr__(name, value)
