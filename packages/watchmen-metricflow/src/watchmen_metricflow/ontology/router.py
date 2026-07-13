"""Ontology Data Access REST router.

MVP provides REST query endpoints:
- POST /ontology/{ontology_id}/query: execute the query
- POST /ontology/{ontology_id}/query/compile: compile SQL only, for debugging
"""

from typing import Any, Dict

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_meta.admin import OntologyService, TopicService
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
	# Reuse the ontology_service storage instance so that the DataSourceService
	# inside engine_provider shares the same connection / transaction as the
	# outer trans_readonly.
	engine_provider = OntologyRdsEngineProvider(principal_service, storage=ontology_service.storage)
	# Reuse the same storage instance to build TopicService for factor-type masking.
	topic_service = TopicService(
		ontology_service.storage, ontology_service.snowflakeGenerator, ontology_service.principalService)
	return OntologyDataAccessService(
		principal_service, ontology_service, engine_provider=engine_provider, topic_service=topic_service)


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
