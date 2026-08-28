from datetime import datetime
from enum import Enum

from watchmen_model.common import Storable, TenantId, UserId


class AuditOperationType(str, Enum):
	# api data queries, mostly GET requests
	QUERY = 'query'
	# create/update/delete on configuration resources, such as topics, pipelines, data sources and users
	CONFIG_EDIT = 'config-edit'
	# manual executions, such as pipeline log rerun and data rerun
	EXECUTE = 'execute'
	IMPORT = 'import'
	EXPORT = 'export'
	LOGIN = 'login'
	LOGOUT = 'logout'


class AuditLog(Storable):
	auditId: str = None
	tenantId: TenantId = None
	userId: UserId = None
	# the account the operation is performed by, None when it cannot be resolved, such as failed logins
	userName: str = None
	operationType: str = None
	# the configuration resource the operation acts on, such as topic, pipeline, datasource
	resource: str = None
	# business detail of the operation, such as the name and id of a saved topic
	detail: str = None
	# http method and path of the audited request
	method: str = None
	path: str = None
	queryString: str = None
	# False when the request handler raised
	success: bool = None
	durationMs: int = None
	clientIp: str = None
	userAgent: str = None
	occurredAt: datetime = None
