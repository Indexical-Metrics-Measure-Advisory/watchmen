from typing import Dict, List

from pydantic import BaseModel

from watchmen_model.common import TenantBasedTuple, Storable, OptimisticLock


class JoinKey(Storable, BaseModel):
	parent_key: str = None
	child_key: str = None


class CollectorTableConfig(TenantBasedTuple, OptimisticLock, BaseModel):
	configId: str = None
	name: str = None
	tableName: str = None
	primaryKey: str = None
	objectKey: str = None
	modelName: str = None
	parentName: str = None
	joinKeys: List[JoinKey] = None
	dependOn: List[Dict] = None
	auditColumn: str = None
	dataSourceId: str = None
	isList: bool = False
	triggered: bool = False

