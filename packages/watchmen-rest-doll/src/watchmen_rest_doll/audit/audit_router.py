from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Body, Depends

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator, \
	AuditLogService, ask_audit_log_criteria
from watchmen_model.admin import UserRole
from watchmen_model.common import DataPage, Pageable
from watchmen_model.system import AuditLog
from watchmen_rest import get_any_admin_principal
from watchmen_rest_doll.util import trans_readonly
from watchmen_utilities import ExtendedBaseModel

router = APIRouter()

DEFAULT_AUDIT_PAGE_SIZE = 20


class QueryAuditLogDataPage(DataPage):
	data: List[AuditLog]


class AuditLogCriteria(ExtendedBaseModel):
	accounts: Optional[List[str]] = None
	operationTypes: Optional[List[str]] = None
	resources: Optional[List[str]] = None
	# keyword matched against the request path
	keyword: Optional[str] = None
	success: Optional[bool] = None
	start: Optional[datetime] = None
	end: Optional[datetime] = None
	# pagination is accepted both nested ({pageable: {pageNumber, pageSize}})
	# and at the top level ({pageNumber, pageSize}), the frontend sends the latter
	pageable: Optional[Pageable] = None
	pageNumber: Optional[int] = None
	pageSize: Optional[int] = None

	def get_pageable(self) -> Pageable:
		# ExtendedBaseModel keeps raw input values, nested pageable may arrive as a dict
		# and scalar fields may arrive as strings, coerce defensively
		if isinstance(self.pageable, dict):
			nested = Pageable(**self.pageable)
		elif isinstance(self.pageable, Pageable):
			nested = self.pageable
		else:
			nested = Pageable(
				pageNumber=ask_int(self.pageNumber, 1),
				pageSize=ask_int(self.pageSize, DEFAULT_AUDIT_PAGE_SIZE)
			)
		return Pageable(
			pageNumber=ask_int(nested.pageNumber, 1),
			pageSize=ask_int(nested.pageSize, DEFAULT_AUDIT_PAGE_SIZE)
		)

	def ask_success(self) -> Optional[bool]:
		value = self.success
		if value is None:
			return None
		if isinstance(value, bool):
			return value
		return str(value).strip().lower() in ('true', '1', 'yes')

	def ask_start(self) -> Optional[datetime]:
		return ask_datetime(self.start)

	def ask_end(self) -> Optional[datetime]:
		return ask_datetime(self.end)


def ask_int(value, default: int) -> int:
	try:
		return int(value)
	except (TypeError, ValueError):
		return default


def ask_datetime(value) -> Optional[datetime]:
	if value is None or isinstance(value, datetime):
		return value
	try:
		parsed = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
	except ValueError:
		return None
	# watchmen stores naive datetimes, drop the timezone offset if present
	if parsed.tzinfo is not None:
		parsed = parsed.replace(tzinfo=None)
	return parsed


def get_audit_log_service() -> AuditLogService:
	return AuditLogService(ask_meta_storage(), ask_snowflake_generator())


def ask_tenant_id(principal_service: PrincipalService) -> Optional[str]:
	# super admin sees all tenants, others are scoped to their own
	return None if principal_service.is_super_admin() else principal_service.get_tenant_id()


@router.post('/audit/log', tags=[UserRole.ADMIN], response_model=None)
async def query_audit_logs(
		criteria: AuditLogCriteria = Body(...),
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> QueryAuditLogDataPage:
	service = get_audit_log_service()
	tenant_id = ask_tenant_id(principal_service)

	def action() -> QueryAuditLogDataPage:
		pageable = criteria.get_pageable()
		found = service.find_page(ask_audit_log_criteria(
			tenant_id=tenant_id,
			accounts=criteria.accounts,
			operation_types=criteria.operationTypes,
			resources=criteria.resources,
			keyword=criteria.keyword,
			success=criteria.ask_success(),
			start=criteria.ask_start(),
			end=criteria.ask_end()
		), pageable)
		# noinspection PyTypeChecker
		return QueryAuditLogDataPage(
			pageNumber=pageable.pageNumber,
			pageSize=pageable.pageSize,
			itemCount=found.itemCount, pageCount=found.pageCount,
			data=found.data
		)

	return trans_readonly(service, action)


@router.get('/audit/log/accounts', tags=[UserRole.ADMIN], response_model=None)
async def list_audit_accounts(
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> List[str]:
	service = get_audit_log_service()
	tenant_id = ask_tenant_id(principal_service)

	def action() -> List[str]:
		return service.find_distinct_values('user_name', ask_audit_log_criteria(
			tenant_id=tenant_id, accounts=None, operation_types=None, resources=None,
			keyword=None, success=None, start=None, end=None
		))

	return trans_readonly(service, action)


@router.get('/audit/log/operation-types', tags=[UserRole.ADMIN], response_model=None)
async def list_audit_operation_types(
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> List[str]:
	service = get_audit_log_service()
	tenant_id = ask_tenant_id(principal_service)

	def action() -> List[str]:
		return service.find_distinct_values('operation_type', ask_audit_log_criteria(
			tenant_id=tenant_id, accounts=None, operation_types=None, resources=None,
			keyword=None, success=None, start=None, end=None
		))

	return trans_readonly(service, action)
