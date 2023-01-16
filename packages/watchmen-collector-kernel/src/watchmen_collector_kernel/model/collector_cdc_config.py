from pydantic import BaseModel

from watchmen_model.common import TenantBasedTuple, Storable, OptimisticLock


class JoinKey(Storable):
	parent_key: str
	child_key: str


class CollectorTableConfig(TenantBasedTuple, OptimisticLock, BaseModel):
	config_id: str
	name: str
	table_name: str
	unique_key: list = []
	module: str
	parent_name: str
	join_key: list = []
	disabled: bool = False
	columns: list = []
	filter_criteria: str
	dependency: str
	triggered: bool = False
	audit_column: str
	data_source_id: str
	is_list: bool = False

