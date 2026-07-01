"""Ontology Data Access REST 路由。

MVP 提供 REST 查询能力：
- POST /ontology/{ontology_id}/query：执行查询
- POST /ontology/{ontology_id}/query/compile：仅编译 SQL，用于调试
"""

from typing import Any, Dict

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_meta.admin import OntologyService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_rest import get_console_principal

from watchmen_metricflow.ontology.engine_provider import OntologyRdsEngineProvider
from watchmen_metricflow.ontology.schema import OntologyQueryRequest, OntologyQueryResponse
from watchmen_metricflow.ontology.service import OntologyDataAccessService
from watchmen_metricflow.util import trans_readonly

router = APIRouter()


def get_ontology_service(principal_service: PrincipalService) -> OntologyService:
	return OntologyService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_data_access_service(
		principal_service: PrincipalService,
		ontology_service: OntologyService,
) -> OntologyDataAccessService:
	# 复用 ontology_service 的 storage 实例，保证 engine_provider 内的 DataSourceService
	# 与外层 trans_readonly 共享同一 connection / 事务。
	engine_provider = OntologyRdsEngineProvider(principal_service, storage=ontology_service.storage)
	return OntologyDataAccessService(principal_service, ontology_service, engine_provider=engine_provider)


@router.post('/ontology/{ontology_id}/query', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=OntologyQueryResponse)
async def query_ontology_data(
		ontology_id: str,
		request: OntologyQueryRequest,
		principal_service: PrincipalService = Depends(get_console_principal),
) -> OntologyQueryResponse:
	ontology_service = get_ontology_service(principal_service)
	data_service = get_data_access_service(principal_service, ontology_service)

	def action() -> OntologyQueryResponse:
		return data_service.query(ontology_id, request)

	return trans_readonly(ontology_service, action)


@router.post('/ontology/{ontology_id}/query/compile', tags=[UserRole.CONSOLE, UserRole.ADMIN])
async def compile_ontology_query(
		ontology_id: str,
		request: OntologyQueryRequest,
		principal_service: PrincipalService = Depends(get_console_principal),
) -> Dict[str, Any]:
	ontology_service = get_ontology_service(principal_service)
	data_service = get_data_access_service(principal_service, ontology_service)

	def action() -> Dict[str, Any]:
		return data_service.compile_preview(ontology_id, request)

	return trans_readonly(ontology_service, action)
