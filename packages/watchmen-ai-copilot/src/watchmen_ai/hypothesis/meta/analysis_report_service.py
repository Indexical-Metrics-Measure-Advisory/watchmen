from typing import List, Optional

from watchmen_ai.hypothesis.model.analysis_report import AnalysisReport, AnalysisReportHeader
from watchmen_meta.common import UserBasedTupleService, UserBasedTupleShaper, AuditableShaper
from watchmen_model.common import TenantId
from watchmen_storage import EntityShaper, EntityRow, EntityCriteriaExpression, ColumnNameLiteral


class AnalysisReportShaper(UserBasedTupleShaper):
    def serialize(self, analysis_report: AnalysisReport) -> EntityRow:
        row = {
            'analysis_report_id': analysis_report.analysisReportId,
            'header': analysis_report.header.model_dump() if analysis_report.header else None,
            'content': analysis_report.content,
            'challenge_id': analysis_report.challenge_id,
            'status': analysis_report.status
        }

        row = AuditableShaper.serialize(analysis_report, row)
        row = UserBasedTupleShaper.serialize(analysis_report, row)
        return row

    def deserialize(self, row: EntityRow) -> AnalysisReport:
        header_data = row.get('header')
        header = None
        if header_data:
            header = AnalysisReportHeader(
                timePeriod=header_data.get('timePeriod', ''),
                challengeName=header_data.get('challengeName', ''),
                questionCount=header_data.get('questionCount', 0),
                hypothesisCount=header_data.get('hypothesisCount', 0),
                metricCount=header_data.get('metricCount', 0)
            )
        
        analysis_report = AnalysisReport(
            analysisReportId=row.get('analysis_report_id'),
            header=header,
            content=row.get('content', ''),
            challenge_id=row.get('challenge_id'),
            status=row.get('status', 'draft')
        )
        # noinspection PyTypeChecker
        analysis_report: AnalysisReport = AuditableShaper.deserialize(row, analysis_report)
        # noinspection PyTypeChecker
        analysis_report: AnalysisReport = UserBasedTupleShaper.deserialize(row, analysis_report)

        return analysis_report


ANALYSIS_REPORT_ENTITY_NAME = 'analysis_reports'
ANALYSIS_REPORT_ENTITY_SHAPER = AnalysisReportShaper()


class AnalysisReportService(UserBasedTupleService):
    def should_record_operation(self) -> bool:
        return False

    def get_entity_name(self) -> str:
        return ANALYSIS_REPORT_ENTITY_NAME

    def get_entity_shaper(self) -> EntityShaper:
        return ANALYSIS_REPORT_ENTITY_SHAPER

    def get_storable_id(self, storable: AnalysisReport) -> str:
        return storable.analysisReportId

    def set_storable_id(self, storable: AnalysisReport, storable_id: str) -> AnalysisReport:
        storable.analysisReportId = storable_id
        return storable

    def get_storable_id_column_name(self) -> str:
        return 'analysis_report_id'

    def find_all(self, tenant_id: Optional[TenantId]) -> List[AnalysisReport]:
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))

    def find_by_challenge_id(self, challenge_id: str, tenant_id: Optional[TenantId]) -> List[AnalysisReport]:
        """Find analysis reports by challenge ID"""
        criteria = [
            EntityCriteriaExpression(left=ColumnNameLiteral(columnName='challenge_id'), right=challenge_id)
        ]
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))

    def find_by_status(self, status: str, tenant_id: Optional[TenantId]) -> List[AnalysisReport]:
        """Find analysis reports by status"""
        criteria = [
            EntityCriteriaExpression(left=ColumnNameLiteral(columnName='status'), right=status)
        ]
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))