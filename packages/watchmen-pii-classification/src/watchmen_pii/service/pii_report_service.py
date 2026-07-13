"""PII report + dashboard service.

Builds the term-level overview and global dashboard described in the design
doc (section 9), and produces CSV / xlsx exports. CSV uses the stdlib ``csv``
module; xlsx uses ``openpyxl``. These are the project's first export
helpers — confirmed absent from the rest of the codebase — so they are kept
self-contained here.
"""
import csv
import io
from logging import getLogger
from typing import List, Optional, Tuple

from watchmen_auth import PrincipalService

from watchmen_pii.meta import PIITermService
from watchmen_pii.model import (
	PII_CATEGORY_BUSINESS,
	PIIClassificationTerm,
	PiiGlobalDashboard,
	PiiTermOverview,
	SENSITIVITY_LEVEL_1,
)

logger = getLogger(__name__)


class PiiReportService:
	"""Builds PII dashboards and exports."""

	def __init__(
			self,
			pii_term_service: PIITermService,
			principal_service: PrincipalService,
			lineage_report_service=None,
	) -> None:
		self._pii_term_service = pii_term_service
		self._principal_service = principal_service
		self._lineage_report_service = lineage_report_service  # optional, injected to reuse analysis

	def get_overview_report(self) -> PiiGlobalDashboard:
		tenant_id = self._principal_service.get_tenant_id()
		terms = self._pii_term_service.find_all_for_tenant(tenant_id)
		overviews = [self._term_overview(term) for term in terms]
		return self._assemble_dashboard(overviews)

	def export_csv(self) -> str:
		dashboard = self.get_overview_report()
		buf = io.StringIO()
		writer = csv.writer(buf)
		writer.writerow([
			'termId', 'termName', 'sensitivityLevel', 'category',
			'linkedFactorCount', 'topicCount', 'pipelineCount', 'metricCount',
			'encryptedFactorCount', 'plaintextFactorCount',
			'maxUpstreamDepth', 'maxDownstreamDepth',
		])
		for row in dashboard.terms:
			writer.writerow([
				row.termId, row.termName, row.sensitivityLevel, row.category,
				row.linkedFactorCount, row.topicCount, row.pipelineCount, row.metricCount,
				row.encryptedFactorCount, row.plaintextFactorCount,
				row.maxUpstreamDepth, row.maxDownstreamDepth,
			])
		return buf.getvalue()

	def export_xlsx(self) -> bytes:
		try:
			from openpyxl import Workbook
		except ImportError as exc:  # pragma: no cover
			raise ImportError("openpyxl is required for xlsx export.") from exc
		dashboard = self.get_overview_report()
		wb = Workbook()
		ws = wb.active
		ws.title = "PII Overview"
		headers = [
			'termId', 'termName', 'sensitivityLevel', 'category',
			'linkedFactorCount', 'topicCount', 'pipelineCount', 'metricCount',
			'encryptedFactorCount', 'plaintextFactorCount',
			'maxUpstreamDepth', 'maxDownstreamDepth',
		]
		ws.append(headers)
		for row in dashboard.terms:
			ws.append([
				row.termId, row.termName, row.sensitivityLevel, row.category,
				row.linkedFactorCount, row.topicCount, row.pipelineCount, row.metricCount,
				row.encryptedFactorCount, row.plaintextFactorCount,
				row.maxUpstreamDepth, row.maxDownstreamDepth,
			])
		buf = io.BytesIO()
		wb.save(buf)
		return buf.getvalue()

	# ------------------------------------------------------------------ internals

	def _term_overview(self, term: PIIClassificationTerm) -> PiiTermOverview:
		linked = term.linkedFactors or []
		topics = {lf.topicId for lf in linked if lf.topicId}
		# Depth + pipeline/metric counts require the lineage service. If one is
		# available, reuse it; otherwise fall back to cheap local aggregates.
		overview = PiiTermOverview(
			termId=term.termId,
			termName=term.name,
			sensitivityLevel=term.sensitivityLevel,
			category=term.category,
			linkedFactorCount=len(linked),
			topicCount=len(topics),
		)
		if self._lineage_report_service is not None and term.termId:
			try:
				report = self._lineage_report_service.analyze(term.termId, include_metrics=True)
				overview.pipelineCount = self._unique_pipeline_count(report)
				overview.metricCount = len(report.metrics)
				overview.encryptedFactorCount = report.encryptionCoverage.encrypted
				overview.plaintextFactorCount = report.encryptionCoverage.plaintext
				overview.maxUpstreamDepth = report.maxUpstreamDepth
				overview.maxDownstreamDepth = report.maxDownstreamDepth
			except Exception:
				logger.debug("Lineage analysis failed for term %s; using shallow overview.", term.termId, exc_info=True)
		return overview

	@staticmethod
	def _unique_pipeline_count(report) -> int:
		ids = set()
		for route in report.upstreamRoutes + report.downstreamRoutes:
			for step in route.steps:
				if step.kind == 'pipeline' and step.pipelineId:
					ids.add(step.pipelineId)
		return len(ids)

	@staticmethod
	def _assemble_dashboard(overviews: List[PiiTermOverview]) -> PiiGlobalDashboard:
		by_level: dict = {}
		by_category: dict = {}
		for ov in overviews:
			if ov.sensitivityLevel:
				by_level[ov.sensitivityLevel] = by_level.get(ov.sensitivityLevel, 0) + 1
			if ov.category:
				by_category[ov.category] = by_category.get(ov.category, 0) + 1
		high_risk = [
			ov for ov in overviews
			if ov.sensitivityLevel == SENSITIVITY_LEVEL_1 and ov.plaintextFactorCount > 0
		]
		high_risk.sort(key=lambda ov: (-ov.plaintextFactorCount, ov.termName))
		top_impact = sorted(
			overviews,
			key=lambda ov: (-(ov.pipelineCount + ov.metricCount), ov.termName),
		)
		return PiiGlobalDashboard(
			totalTerms=len(overviews),
			bySensitivityLevel=by_level,
			byCategory=by_category,
			highRiskTerms=high_risk[:20],
			topImpactTerms=top_impact[:20],
			terms=overviews,
		)
