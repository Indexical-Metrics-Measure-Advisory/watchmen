from typing import List, Optional

from pydantic.alias_generators import to_camel

from watchmen_model.common import DataPage, Pageable
from watchmen_model.system import AuditLog
from watchmen_storage import EntityName, EntityShaper, EntityRow, \
	EntityCriteriaExpression, ColumnNameLiteral, \
	EntityCriteriaOperator, EntitySortColumn, EntitySortMethod, \
	SnowflakeGenerator, TransactionalStorageSPI

from .storage_service import EntityService


class AuditLogShaper(EntityShaper):

	def serialize(self, audit_log: AuditLog) -> EntityRow:
		return {
			'audit_id': audit_log.auditId,
			'tenant_id': audit_log.tenantId,
			'user_id': audit_log.userId,
			'user_name': audit_log.userName,
			'operation_type': audit_log.operationType,
			'resource': audit_log.resource,
			'detail': audit_log.detail,
			'method': audit_log.method,
			'path': audit_log.path,
			'query_string': audit_log.queryString,
			'success': audit_log.success,
			'duration_ms': audit_log.durationMs,
			'client_ip': audit_log.clientIp,
			'user_agent': audit_log.userAgent,
			'occurred_at': audit_log.occurredAt
		}

	def deserialize(self, row: EntityRow) -> AuditLog:
		# noinspection PyTypeChecker
		return AuditLog(
			auditId=row.get('audit_id'),
			tenantId=row.get('tenant_id'),
			userId=row.get('user_id'),
			userName=row.get('user_name'),
			operationType=row.get('operation_type'),
			resource=row.get('resource'),
			detail=row.get('detail'),
			method=row.get('method'),
			path=row.get('path'),
			queryString=row.get('query_string'),
			success=row.get('success'),
			durationMs=row.get('duration_ms'),
			clientIp=row.get('client_ip'),
			userAgent=row.get('user_agent'),
			occurredAt=row.get('occurred_at')
		)


AUDIT_LOG_TABLE = 'audit_log'
AUDIT_LOG_ENTITY_SHAPER = AuditLogShaper()


class AuditLogService(EntityService):

	def __init__(
			self,
			storage: TransactionalStorageSPI,
			snowflake_generator: SnowflakeGenerator
	):
		super().__init__(storage)
		self.with_snowflake_generator(snowflake_generator)

	def get_entity_name(self) -> EntityName:
		return AUDIT_LOG_TABLE

	def get_entity_shaper(self) -> EntityShaper:
		return AUDIT_LOG_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> EntityName:
		return 'audit_id'

	def get_storable_id(self, storable: AuditLog):
		return storable.auditId

	def set_storable_id(self, storable: AuditLog, storable_id: str) -> AuditLog:
		storable.auditId = storable_id
		return storable

	def record(self, audit_log: AuditLog) -> None:
		self.redress_storable_id(audit_log)
		self.storage.insert_one(audit_log, self.get_entity_helper())

	def find_page(self, criteria: Optional[List], pageable: Pageable) -> DataPage:
		sort = EntitySortColumn(name='occurred_at', method=EntitySortMethod.DESC)
		# noinspection PyTypeChecker
		return self.storage.page(self.get_entity_pager(
			criteria=criteria, pageable=pageable, sort=[sort]))

	def find_distinct_values(self, column_name: str, criteria: Optional[List]) -> List[str]:
		rows = self.storage.find_distinct_values(self.get_entity_finder_for_columns(
			criteria=criteria, distinctColumnNames=[column_name], distinctValueOnSingleColumn=True,
			sort=[EntitySortColumn(name=column_name, method=EntitySortMethod.ASC)]
		))
		# storage deserializes each row into an AuditLog, the value sits on the camelCase attribute
		attribute_name = to_camel(column_name)
		return [value for row in rows if (value := getattr(row, attribute_name)) is not None]


def ask_audit_log_criteria(
		tenant_id: Optional[str],
		accounts: Optional[List[str]],
		operation_types: Optional[List[str]],
		resources: Optional[List[str]],
		keyword: Optional[str],
		success: Optional[bool],
		start: Optional[object],
		end: Optional[object]
) -> List:
	"""
	build the storage criteria shared by the page query and the distinct value queries.
	`start`/`end` are datetimes on the occurred_at column.
	"""
	criteria = []
	# a super admin sees all tenants, including records whose account cannot be resolved
	if tenant_id is not None:
		criteria.append(EntityCriteriaExpression(
			left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
	if accounts is not None and len(accounts) > 0:
		criteria.append(EntityCriteriaExpression(
			left=ColumnNameLiteral(columnName='user_name'),
			operator=EntityCriteriaOperator.IN, right=accounts))
	if operation_types is not None and len(operation_types) > 0:
		criteria.append(EntityCriteriaExpression(
			left=ColumnNameLiteral(columnName='operation_type'),
			operator=EntityCriteriaOperator.IN, right=operation_types))
	if resources is not None and len(resources) > 0:
		criteria.append(EntityCriteriaExpression(
			left=ColumnNameLiteral(columnName='resource'),
			operator=EntityCriteriaOperator.IN, right=resources))
	if keyword is not None and len(keyword.strip()) > 0:
		criteria.append(EntityCriteriaExpression(
			left=ColumnNameLiteral(columnName='path'),
			operator=EntityCriteriaOperator.LIKE, right=f'%{keyword.strip()}%'))
	if success is not None:
		criteria.append(EntityCriteriaExpression(
			left=ColumnNameLiteral(columnName='success'), right=success))
	if start is not None:
		criteria.append(EntityCriteriaExpression(
			left=ColumnNameLiteral(columnName='occurred_at'),
			operator=EntityCriteriaOperator.GREATER_THAN_OR_EQUALS, right=start))
	if end is not None:
		criteria.append(EntityCriteriaExpression(
			left=ColumnNameLiteral(columnName='occurred_at'),
			operator=EntityCriteriaOperator.LESS_THAN_OR_EQUALS, right=end))
	return criteria
