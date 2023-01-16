from typing import List

from pydantic import BaseModel

from watchmen_model.common import TenantBasedTuple


class RootNode(BaseModel):
	tableName: str
	uniqueKey: str
	uniqueKeyValue: str


class Dependency(BaseModel):
	modelName: str
	objectId: str


class CollectorIntegratedRecord(TenantBasedTuple, BaseModel):
	integratedRecordId: str
	resourceId: str  # globally unique
	dataContent: str
	modelName: str
	objectId: str
	dependencies: List[Dependency] = []
	needMergeJson: bool
	rootNode: RootNode
