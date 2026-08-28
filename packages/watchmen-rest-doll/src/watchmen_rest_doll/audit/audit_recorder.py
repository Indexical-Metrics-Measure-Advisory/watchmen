import time
from logging import getLogger
from typing import AsyncGenerator, Optional, Tuple

from fastapi import Request
from starlette.concurrency import run_in_threadpool

from watchmen_auth import AuthenticationScheme, PrincipalService
from watchmen_meta.auth import build_find_user_by_name, build_find_user_by_pat
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator, AuditLogService
from watchmen_model.system import AuditLog, AuditOperationType
from watchmen_rest.authentication import validate_jwt
from watchmen_utilities import get_current_time_in_seconds

from ..doll import ask_audit_enabled, ask_jwt_params

logger = getLogger(f'app.{__name__}')

# requests on these paths are never audited: infrastructure, bootstrap calls and the audit api itself
AUDIT_IGNORED_PATHS = (
	'/health', '/metrics', '/docs', '/redoc', '/openapi.json', '/favicon.ico',
	# authentication bootstrap noise, login is audited explicitly in the authenticate router
	'/auth/config', '/token/validate/jwt', '/token/exchange-user',
	# audit-of-audit noise
	'/audit/log', '/audit/log/accounts', '/audit/log/operation-types',
)


def is_audited_request(request: Request) -> bool:
	if request.method == 'OPTIONS':
		return False
	path = request.url.path
	if path in AUDIT_IGNORED_PATHS:
		return False
	if path.startswith('/health'):
		return False
	return True


def ask_operation_type(method: str, path: str) -> AuditOperationType:
	"""
	classify an audited request into a business friendly operation type
	"""
	if '/rerun' in path:
		return AuditOperationType.EXECUTE
	if method.upper() == 'GET':
		if '/yaml' in path or '/export' in path or '/script_package' in path:
			return AuditOperationType.EXPORT
		return AuditOperationType.QUERY
	if '/import' in path or '/yaml' in path:
		return AuditOperationType.IMPORT
	# create/update/delete on configuration resources, such as topics, pipelines, data sources and users
	return AuditOperationType.CONFIG_EDIT


# path fragment -> audited resource type, ordered so longer fragments match first
RESOURCE_PATH_FRAGMENTS: tuple = (
	('/user_group', 'user-group'),
	('/user', 'user'),
	('/topic', 'topic'),
	('/pipeline', 'pipeline'),
	('/datasource', 'datasource'),
	('/data_source', 'datasource'),
	('/space', 'space'),
	('/dashboard', 'dashboard'),
	('/report', 'report'),
	('/subject', 'subject'),
	('/tag', 'tag'),
	('/tenant', 'tenant'),
	('/pat', 'pat'),
	('/lineage', 'lineage'),
	('/enumeration', 'enumeration'),
	('/plugin', 'plugin'),
	('/external_writer', 'external-writer'),
)


def ask_resource(path: str) -> Optional[str]:
	for fragment, resource in RESOURCE_PATH_FRAGMENTS:
		if fragment in path:
			return resource
	return None


def trunc(value: Optional[str], length: int) -> Optional[str]:
	if value is None:
		return None
	return value[:length]


def ask_account(request: Request) -> Tuple[Optional[str], Optional[str], Optional[str]]:
	"""
	resolve (user id, user name, tenant id) from the authorization header.
	returns (None, None, None) when the request carries no recognizable credentials,
	such as failed login attempts.
	"""
	authorization = request.headers.get('Authorization')
	if not authorization:
		return None, None, None
	scheme, _, token = authorization.partition(' ')
	if not token:
		return None, None, None
	try:
		user = None
		if scheme.lower() == AuthenticationScheme.JWT.value.lower():
			secret_key, algorithm = ask_jwt_params()
			payload = validate_jwt(token.strip(), secret_key, algorithm)
			username = payload.get('sub')
			if username:
				user = build_find_user_by_name()(username)
		elif scheme.lower() == AuthenticationScheme.PAT.value.lower():
			user = build_find_user_by_pat()(token.strip())
		if user is None:
			return None, None, None
		return user.userId, user.name, user.tenantId
	except Exception as e:
		# credentials exist but cannot be resolved into a user, keep auditing with the raw request only
		logger.debug(f'Failed to resolve audit account: {e}')
		return None, None, None


def save_audit_log(audit_log: AuditLog) -> None:
	service = AuditLogService(ask_meta_storage(), ask_snowflake_generator())
	service.begin_transaction()
	try:
		service.record(audit_log)
		service.commit_transaction()
	except Exception as e:
		logger.warning(f'Failed to save audit log: {e}', exc_info=True)
		service.rollback_transaction()


def record_audit(request: Request, success: bool, elapsed_ms: int) -> None:
	# an explicit in-router audit call already recorded this request
	if getattr(request.state, 'audit_explicit', False):
		return
	try:
		method, path = request.method, request.url.path
		user_id, user_name, tenant_id = ask_account(request)
		save_audit_log(AuditLog(
			tenantId=tenant_id,
			userId=user_id,
			userName=trunc(user_name, 100),
			operationType=ask_operation_type(method, path).value,
			resource=ask_resource(path),
			method=trunc(method, 16),
			path=trunc(path, 512),
			queryString=trunc(request.url.query or None, 1024),
			success=success,
			durationMs=elapsed_ms,
			clientIp=request.client.host if request.client is not None else None,
			userAgent=trunc(request.headers.get('user-agent'), 512),
			occurredAt=get_current_time_in_seconds()
		))
	except Exception as e:
		# auditing must never break the audited request
		logger.warning(f'Failed to record audit log: {e}')


def record_login_audit(
		request: Request, username: str, success: bool,
		user_id: Optional[str] = None, tenant_id: Optional[str] = None
) -> None:
	try:
		save_audit_log(AuditLog(
			tenantId=tenant_id,
			userId=user_id,
			userName=trunc(username, 100),
			operationType=AuditOperationType.LOGIN.value,
			method='POST',
			path='/login',
			success=success,
			clientIp=request.client.host if request.client is not None else None,
			userAgent=trunc(request.headers.get('user-agent'), 512),
			occurredAt=get_current_time_in_seconds()
		))
	except Exception as e:
		logger.warning(f'Failed to record login audit log: {e}')


def record_save_audit(
		request: Request, resource: str, tuple_id: Optional[str], tuple_name: Optional[str],
		principal_service: PrincipalService
) -> None:
	"""
	explicit in-router audit for configuration saves, such as topic and pipeline.
	records the saved tuple's identity in the detail column, then marks the request
	so the generic router-level recorder does not log the same request twice.
	"""
	try:
		save_audit_log(AuditLog(
			tenantId=principal_service.get_tenant_id(),
			userId=principal_service.get_user_id(),
			userName=trunc(principal_service.get_user_name(), 100),
			operationType=AuditOperationType.CONFIG_EDIT.value,
			resource=resource,
			detail=trunc(f'{tuple_name}({tuple_id})' if tuple_name else str(tuple_id), 512),
			method=request.method,
			path=trunc(request.url.path, 512),
			queryString=trunc(request.url.query or None, 1024),
			success=True,
			clientIp=request.client.host if request.client is not None else None,
			userAgent=trunc(request.headers.get('user-agent'), 512),
			occurredAt=get_current_time_in_seconds()
		))
		request.state.audit_explicit = True
	except Exception as e:
		# on failure the generic recorder still logs the request without detail
		logger.warning(f'Failed to record save audit log: {e}')


async def audit_recorder(request: Request) -> AsyncGenerator[None, None]:
	"""
	router layer audit dependency. attach to a router (or a single route) with
	`Depends(audit_recorder)`, every request handled by that router leaves an audit log.
	"""
	if not ask_audit_enabled() or not is_audited_request(request):
		yield
		return

	started_at = time.monotonic()
	try:
		yield
	except Exception:
		await run_in_threadpool(
			record_audit, request, False, round((time.monotonic() - started_at) * 1000))
		raise
	else:
		await run_in_threadpool(
			record_audit, request, True, round((time.monotonic() - started_at) * 1000))
