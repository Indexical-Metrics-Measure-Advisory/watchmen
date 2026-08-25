"""HTTP API for PII classification.

A single ``APIRouter`` mounted under ``/dqc/pii`` and exposed to
``watchmen-rest-dqc`` via :func:`watchmen_pii.app.get_pii_router`. Endpoint
set follows the design doc (section 10):

* Term CRUD:           GET/POST /dqc/pii-terms, PUT/DELETE /dqc/pii-terms/{termId}
* Factor discovery:    POST /dqc/pii-terms/{termId}/discover
                       POST /dqc/pii-terms/{termId}/factors
                       POST /dqc/pii-terms/{termId}/confirm
* Lineage analysis:    POST /dqc/pii-terms/{termId}/lineage
* Reports:             GET  /dqc/pii-report
                       POST /dqc/pii-report/export/{format}
"""
from typing import List, Optional

from fastapi import APIRouter, Depends
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_rest import get_admin_principal, get_any_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404, validate_tenant_id
from watchmen_utilities import is_blank

from watchmen_pii.meta import PIITermService
from watchmen_pii.model import (
	ConfirmRequest,
	DiscoverResult,
	PIIClassificationTerm,
	PiiGlobalDashboard,
	PiiLineageReport,
)
from watchmen_pii.service import (
	FactorDiscoveryService,
	PIILineageReportService,
	PiiReportService,
)
from watchmen_pii.util import trans, trans_readonly

router = APIRouter()

# ---------------------------------------------------------------------------
# service factories (mirror watchmen-rest-dqc/admin/catalog_router.py)
# ---------------------------------------------------------------------------


def get_pii_term_service(principal_service: PrincipalService) -> PIITermService:
	return PIITermService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_discovery_service(
		pii_term_service: PIITermService, principal_service: PrincipalService
) -> FactorDiscoveryService:
	return FactorDiscoveryService(
		pii_term_service=pii_term_service,
		principal_service=principal_service,
	)


def get_lineage_report_service(
		pii_term_service: PIITermService, principal_service: PrincipalService
) -> PIILineageReportService:
	return PIILineageReportService(
		pii_term_service=pii_term_service,
		principal_service=principal_service,
	)


def get_report_service(
		pii_term_service: PIITermService, principal_service: PrincipalService
) -> PiiReportService:
	return PiiReportService(
		pii_term_service=pii_term_service,
		principal_service=principal_service,
		lineage_report_service=get_lineage_report_service(pii_term_service, principal_service),
	)


# ---------------------------------------------------------------------------
# term CRUD
# ---------------------------------------------------------------------------

@router.get('/dqc/pii-terms', tags=[UserRole.ADMIN], response_model=None)
async def list_pii_terms(
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> List[PIIClassificationTerm]:
	pii_term_service = get_pii_term_service(principal_service)

	def action() -> List[PIIClassificationTerm]:
		return pii_term_service.find_all_for_tenant(principal_service.get_tenant_id())

	return trans_readonly(pii_term_service, action)


@router.post('/dqc/pii-terms', tags=[UserRole.ADMIN], response_model=None)
async def save_pii_term(
		term: PIIClassificationTerm,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> PIIClassificationTerm:
	validate_tenant_id(term, principal_service)
	pii_term_service = get_pii_term_service(principal_service)

	def action() -> PIIClassificationTerm:
		if pii_term_service.is_storable_id_faked(term.termId):
			pii_term_service.redress_storable_id(term)
			return pii_term_service.create(term)
		existing = pii_term_service.find_by_id(term.termId)
		if existing is None:
			raise_404()
		if existing.tenantId != term.tenantId:
			raise_403()
		# discovery/confirm write back the term behind the editor's back, which
		# bumps the version; reconcile with the stored one to avoid stale
		# optimistic-lock failures on save
		term.version = existing.version
		return pii_term_service.update(term)

	return trans(pii_term_service, action)


@router.put('/dqc/pii-terms/{term_id}', tags=[UserRole.ADMIN], response_model=None)
async def update_pii_term(
		term_id: str, term: PIIClassificationTerm,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> PIIClassificationTerm:
	if is_blank(term_id) or term.termId != term_id:
		raise_400('termId mismatch.')
	validate_tenant_id(term, principal_service)
	pii_term_service = get_pii_term_service(principal_service)

	def action() -> PIIClassificationTerm:
		existing = pii_term_service.find_by_id(term_id)
		if existing is None:
			raise_404()
		if existing.tenantId != term.tenantId:
			raise_403()
		# reconcile optimistic-lock version with the stored one, see save_pii_term
		term.version = existing.version
		return pii_term_service.update(term)

	return trans(pii_term_service, action)


@router.get('/dqc/pii-terms/{term_id}', tags=[UserRole.ADMIN], response_model=None)
async def load_pii_term(
		term_id: str,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> PIIClassificationTerm:
	if is_blank(term_id):
		raise_400('termId is required.')
	pii_term_service = get_pii_term_service(principal_service)

	def action() -> PIIClassificationTerm:
		term = pii_term_service.find_by_id(term_id)
		if term is None:
			raise_404()
		if term.tenantId != principal_service.get_tenant_id():
			raise_404()
		return term

	return trans_readonly(pii_term_service, action)


@router.delete('/dqc/pii-terms/{term_id}', tags=[UserRole.SUPER_ADMIN], response_model=None)
async def delete_pii_term(
		term_id: str,
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> PIIClassificationTerm:
	if is_blank(term_id):
		raise_400('termId is required.')
	pii_term_service = get_pii_term_service(principal_service)

	def action() -> PIIClassificationTerm:
		if principal_service.is_super_admin():
			term = pii_term_service.delete(term_id)
		else:
			existing = pii_term_service.find_by_id(term_id)
			if existing is None:
				term = existing
			elif existing.tenantId != principal_service.get_tenant_id():
				term = None
			else:
				term = pii_term_service.delete(term_id)
		if term is None:
			raise_404()
		return term

	return trans(pii_term_service, action)


# ---------------------------------------------------------------------------
# discovery + confirm
# ---------------------------------------------------------------------------

@router.post('/dqc/pii-terms/{term_id}/discover', tags=[UserRole.ADMIN], response_model=None)
async def discover_factors(
		term_id: str,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> DiscoverResult:
	if is_blank(term_id):
		raise_400('termId is required.')
	# One PIITermService (hence one storage instance) per request; the
	# transaction and all reads/writes inside action share it.
	pii_term_service = get_pii_term_service(principal_service)
	discovery_service = get_discovery_service(pii_term_service, principal_service)

	def action() -> DiscoverResult:
		# Discovery writes back linkedFactors, so it runs in a real transaction.
		try:
			return discovery_service.discover(term_id)
		except LookupError:
			raise_404()

	return trans(pii_term_service, action)


@router.post('/dqc/pii-terms/{term_id}/factors', tags=[UserRole.ADMIN], response_model=None)
async def add_term_factor(
		term_id: str, body: Optional[dict] = None,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> PIIClassificationTerm:
	if is_blank(term_id):
		raise_400('termId is required.')
	topic_id = (body or {}).get('topicId')
	factor_id = (body or {}).get('factorId')
	if is_blank(topic_id) or is_blank(factor_id):
		raise_400('topicId and factorId are required.')
	pii_term_service = get_pii_term_service(principal_service)
	discovery_service = get_discovery_service(pii_term_service, principal_service)

	def action() -> PIIClassificationTerm:
		try:
			return discovery_service.add_factor(term_id, topic_id, factor_id)
		except LookupError:
			raise_404()

	return trans(pii_term_service, action)


@router.post('/dqc/pii-terms/{term_id}/confirm', tags=[UserRole.ADMIN], response_model=None)
async def confirm_factors(
		term_id: str, body: ConfirmRequest,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> PIIClassificationTerm:
	if is_blank(term_id):
		raise_400('termId is required.')
	pii_term_service = get_pii_term_service(principal_service)
	discovery_service = get_discovery_service(pii_term_service, principal_service)

	def action() -> PIIClassificationTerm:
		try:
			return discovery_service.confirm(term_id, body.factorIds, body.removeFactorIds)
		except LookupError:
			raise_404()

	return trans(pii_term_service, action)


# ---------------------------------------------------------------------------
# lineage
# ---------------------------------------------------------------------------

@router.post('/dqc/pii-terms/{term_id}/lineage', tags=[UserRole.ADMIN], response_model=None)
async def analyze_lineage(
		term_id: str,
		body: Optional[dict] = None,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> PiiLineageReport:
	if is_blank(term_id):
		raise_400('termId is required.')
	pii_term_service = get_pii_term_service(principal_service)
	report_service = get_lineage_report_service(pii_term_service, principal_service)
	max_depth = (body or {}).get('maxDepth', 3)

	def action() -> PiiLineageReport:
		return report_service.analyze(term_id, max_depth=max_depth)

	return trans_readonly(pii_term_service, action)


# ---------------------------------------------------------------------------
# reports
# ---------------------------------------------------------------------------

@router.get('/dqc/pii-report', tags=[UserRole.ADMIN], response_model=None)
async def get_pii_report(
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> PiiGlobalDashboard:
	pii_term_service = get_pii_term_service(principal_service)
	report_service = get_report_service(pii_term_service, principal_service)

	def action() -> PiiGlobalDashboard:
		return report_service.get_overview_report()

	return trans_readonly(pii_term_service, action)


@router.post('/dqc/pii-report/export/{fmt}', tags=[UserRole.ADMIN], response_class=Response)
async def export_pii_report(
		fmt: str,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> Response:
	fmt_norm = (fmt or '').strip().lower()
	if fmt_norm not in ('csv', 'xlsx'):
		raise_400('Unsupported export format. Use csv or xlsx.')
	pii_term_service = get_pii_term_service(principal_service)
	report_service = get_report_service(pii_term_service, principal_service)

	def action():
		if fmt_norm == 'csv':
			return report_service.export_csv().encode('utf-8-sig'), 'text/csv'
		return report_service.export_xlsx(), \
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

	payload, media_type = trans_readonly(pii_term_service, action)
	return Response(content=payload, media_type=media_type,
	                headers={'Content-Disposition': f'attachment; filename="pii-report.{fmt_norm}"'})
