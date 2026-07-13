"""Ontology Data Access Service orchestration layer."""

import logging
from typing import Any, Dict, List, Optional

from sqlalchemy import Engine

from watchmen_auth import PrincipalService
from watchmen_meta.admin import OntologyService, TopicService
from watchmen_rest.util import raise_400, raise_403, raise_404

from watchmen_metricflow.settings import ask_ontology_query_require_filters

from .engine_provider import OntologyRdsEngineProvider
from .factor_type_resolver import FactorTypeResolver
from .schema import OntologyQueryRequest, OntologyQueryResponse
from .security_layer import OntologySecurityLayer
from .sql_compiler import CompiledOntologyQuery, OntologySqlCompileError, OntologySqlCompiler

logger = logging.getLogger(__name__)


class OntologyDataAccessService:
	"""Configuration-driven data access gateway.

	Responsibilities: load VirtualOntology -> compile SQL -> execute Postgres
	query -> mask by role.
	"""

	def __init__(
			self,
			principal_service: PrincipalService,
			ontology_service: OntologyService,
			engine_provider: Optional[OntologyRdsEngineProvider] = None,
			engine: Optional[Engine] = None,
			topic_service: Optional[TopicService] = None,
	) -> None:
		self.principal_service = principal_service
		self.ontology_service = ontology_service
		self.engine_provider = engine_provider
		self.engine = engine
		self.compiler = OntologySqlCompiler()
		# field-level masking by factor type / encrypt: falls back to the name
		# heuristic when topic_service is not provided
		resolver = FactorTypeResolver(topic_service, principal_service)
		self.security = OntologySecurityLayer(principal_service, topic_resolver=resolver)

	def query(self, ontology_id: str, request: OntologyQueryRequest) -> OntologyQueryResponse:
		ontology = self.ontology_service.find_by_id(ontology_id)
		if ontology is None:
			raise_404(f'Ontology [{ontology_id}] not found.')
		if ontology.tenantId != self.principal_service.get_tenant_id():
			raise_403()
		self._check_filters(request)

		try:
			compiled = self.compiler.compile(ontology, request)
		except OntologySqlCompileError as e:
			self._log_compile_error(ontology_id, ontology, request, e)
			raise_400(str(e))

		engine = self._resolve_engine(compiled.virtual_object.datasourceId)
		rows = self._execute(compiled, engine)
		rows = self.security.mask_rows(ontology, compiled.virtual_object, rows, self.principal_service)
		return OntologyQueryResponse(
			virtualObject=compiled.virtual_object.name or compiled.virtual_object.id,
			rows=rows,
			total=None,
		)

	def compile_preview(self, ontology_id: str, request: OntologyQueryRequest) -> Dict[str, Any]:
		"""Compile SQL only, do not execute. Used for debugging and verification in database-less environments."""
		ontology = self.ontology_service.find_by_id(ontology_id)
		if ontology is None:
			raise_404(f'Ontology [{ontology_id}] not found.')
		if ontology.tenantId != self.principal_service.get_tenant_id():
			raise_403()
		self._check_filters(request)
		try:
			compiled = self.compiler.compile(ontology, request)
		except OntologySqlCompileError as e:
			self._log_compile_error(ontology_id, ontology, request, e)
			raise_400(str(e))
		return {
			'virtualObject': compiled.virtual_object.name or compiled.virtual_object.id,
			'sql': str(compiled.statement),
			'labels': compiled.labels,
		}

	@staticmethod
	def _check_filters(request: OntologyQueryRequest) -> None:
		"""Decide whether filters are required based on system configuration."""
		if ask_ontology_query_require_filters() and (not request.filters or len(request.filters) == 0):
			raise_400('filters is required: at least one filter condition must be provided.')

	@staticmethod
	def _log_compile_error(ontology_id: str, ontology, request: OntologyQueryRequest,
			error: OntologySqlCompileError) -> None:
		"""Log the SQL compile error context (ontology / virtual object / request payload) to aid troubleshooting."""
		logger.error(
			'Ontology SQL compile failed | ontology_id=%s | tenant_id=%s | virtual_object_id=%s | '
			'fields=%s | filters=%s | include_derived=%s | limit=%s | offset=%s | error=%s',
			ontology_id,
			getattr(ontology, 'tenantId', None),
			getattr(request, 'virtualObjectId', None),
			getattr(request, 'fields', None),
			getattr(request, 'filters', None),
			getattr(request, 'includeDerived', None),
			getattr(request, 'limit', None),
			getattr(request, 'offset', None),
			str(error),
		)

	def _resolve_engine(self, data_source_id: Optional[str]) -> Optional[Engine]:
		if self.engine is not None:
			return self.engine
		if data_source_id is None:
			# When no business data source is bound, only compile-preview is
			# meaningful; query returns empty data.
			return None
		if self.engine_provider is None:
			self.engine_provider = OntologyRdsEngineProvider(self.principal_service)
		return self.engine_provider.get_engine(data_source_id)

	def _execute(self, compiled: CompiledOntologyQuery, engine: Optional[Engine]) -> List[Dict[str, Any]]:
		if engine is None:
			return []
		with engine.connect() as conn:
			result = conn.execute(compiled.statement)
			return [dict(row._mapping) for row in result.fetchall()]
