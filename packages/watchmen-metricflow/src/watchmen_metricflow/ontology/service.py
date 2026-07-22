"""Ontology Data Access Service orchestration layer."""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import Engine

from watchmen_auth import PrincipalService
from watchmen_meta.admin import OntologyService, TopicService
from watchmen_model.admin import FactorType, VirtualObject
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
		self._factor_resolver = FactorTypeResolver(topic_service, principal_service)
		self.security = OntologySecurityLayer(principal_service, topic_resolver=self._factor_resolver)

	def query(self, ontology_id: str, request: OntologyQueryRequest) -> OntologyQueryResponse:
		ontology = self.ontology_service.find_by_id(ontology_id)
		if ontology is None:
			raise_404(f'Ontology [{ontology_id}] not found.')
		if ontology.tenantId != self.principal_service.get_tenant_id():
			raise_403()
		self._check_filters(request)
		self._prepare_filters(ontology, request)

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
		self._prepare_filters(ontology, request)
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

	# comparison operators restricted to numeric / datetime fields
	_COMPARISON_OPERATORS = ('gt', 'gte', 'lt', 'lte', 'between')
	_NUMERIC_FACTOR_TYPES = (FactorType.SEQUENCE, FactorType.NUMBER, FactorType.UNSIGNED)
	_DATETIME_FACTOR_TYPES = (FactorType.DATE, FactorType.DATETIME, FactorType.FULL_DATETIME, FactorType.TIME)

	def _prepare_filters(self, ontology, request: OntologyQueryRequest) -> None:
		"""Validate comparison-operator filters against factor types and coerce values in place.

		gt/gte/lt/lte/between are allowed only on numeric or datetime fields; between
		additionally requires a list value of exactly 2 elements. When the factor
		cannot be resolved (topic service missing, etc.), the filter passes through
		unvalidated, matching the security layer's fallback philosophy.
		"""
		comparisons = [
			(field, value) for field, value in (request.filters or {}).items()
			if isinstance(value, dict) and str(value.get('operator') or '').lower() in self._COMPARISON_OPERATORS
		]
		if not comparisons:
			return
		virtual_object: Optional[VirtualObject] = next(
			(obj for obj in ontology.virtualObjects or [] if obj.id == request.virtualObjectId), None)
		if virtual_object is None:
			# let the compiler raise the not-found error as before
			return
		resolved = self._factor_resolver.resolve_attributes(virtual_object)
		for field, value in comparisons:
			factor = resolved.get(field)
			if factor is None or not factor.resolved or factor.factor_type is None:
				continue
			operator = str(value.get('operator')).lower()
			if factor.factor_type in self._NUMERIC_FACTOR_TYPES:
				coerce = self._coerce_numeric_value
			elif factor.factor_type in self._DATETIME_FACTOR_TYPES:
				coerce = self._coerce_datetime_value
			else:
				raise_400(f'operator [{operator}] is only supported for numeric or datetime field [{field}].')
			if operator == 'between':
				raw = value.get('value')
				if not isinstance(raw, (list, tuple)) or len(raw) != 2:
					raise_400(
						f'filter value on field [{field}] with operator [between] '
						f'must be a list of exactly 2 elements.')
				value['value'] = [coerce(field, operator, item) for item in raw]
			else:
				value['value'] = coerce(field, operator, value.get('value'))

	@staticmethod
	def _coerce_numeric_value(field: str, operator: str, value: Any) -> Any:
		if isinstance(value, bool) or value is None:
			raise_400(f'filter value on numeric field [{field}] with operator [{operator}] must be a number.')
		if isinstance(value, (int, float)):
			return value
		if isinstance(value, str):
			try:
				return int(value)
			except ValueError:
				try:
					return float(value)
				except ValueError:
					pass
		raise_400(f'filter value [{value}] on numeric field [{field}] cannot be parsed as a number.')

	@staticmethod
	def _coerce_datetime_value(field: str, operator: str, value: Any) -> Any:
		if not isinstance(value, str):
			# already a native type (or None); nothing to validate here
			return value
		try:
			# Python 3.11+ fromisoformat accepts 'YYYY-MM-DD' as well
			datetime.fromisoformat(value)
		except ValueError:
			raise_400(f'filter value [{value}] on datetime field [{field}] is not a valid ISO datetime.')
		# keep the ISO string: FilterCondition only accepts scalar str/int/float/bool
		# values and database drivers bind ISO datetime strings natively
		return value

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
