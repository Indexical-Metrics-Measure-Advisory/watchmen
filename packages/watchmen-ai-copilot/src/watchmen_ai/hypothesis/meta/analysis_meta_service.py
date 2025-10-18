from typing import List, Optional

from watchmen_ai.hypothesis.model.data_story import DataExplain
from watchmen_ai.hypothesis.model.analysis import AnalysisData
from watchmen_meta.common import UserBasedTupleService, UserBasedTupleShaper, AuditableShaper
from watchmen_model.common import TenantId
from watchmen_storage import EntityShaper, EntityRow, EntityCriteriaExpression, ColumnNameLiteral
from watchmen_utilities import ArrayHelper


class AnalysisShaper(UserBasedTupleShaper):

    @staticmethod
    def serialize_explain(explain: DataExplain) -> dict:
        if isinstance(explain, dict):
            return explain
        else:
            return explain.model_dump()

    @staticmethod
    def serialize_explains(explains: Optional[List[DataExplain]]) -> Optional[list]:
        if explains is None:
            return None
        return ArrayHelper(explains).map(lambda x: AnalysisShaper.serialize_explain(x)).to_list()

    @staticmethod
    def serialize_analysis_metric(analysis_metric: dict) -> dict:
        if isinstance(analysis_metric, dict):
            return analysis_metric
        elif hasattr(analysis_metric, 'model_dump'):
            return analysis_metric.model_dump()
        else:
            raise ValueError("Invalid analysis metric type: must be dict or have model_dump method")
    @staticmethod
    def serialize_analysis_metrics(analysis_metrics: Optional[List[dict]]) -> Optional[list]:
        if analysis_metrics is None:
            return None
        return ArrayHelper(analysis_metrics).map(lambda x: AnalysisShaper.serialize_analysis_metric(x)).to_list()

    def serialize(self, analysis: AnalysisData) -> EntityRow:
        row = {
            'analysis_id': analysis.analysis_id,
            'hypotheses': analysis.hypotheses,
            "hypothesis_id": analysis.hypothesis_id,
            'analysis_metrics': AnalysisShaper.serialize_analysis_metrics(analysis.analysis_metrics),
            'test_results': analysis.test_results,
            'metrics_card_data': analysis.metrics_card_data,
            'customer_characteristics': analysis.customer_characteristics,
            'purchase_behaviors': analysis.purchase_behaviors,
            'data_explain_dict': AnalysisShaper.serialize_explains(analysis.data_explain_dict)
        }

        row = AuditableShaper.serialize(analysis, row)
        row = UserBasedTupleShaper.serialize(analysis, row)
        return row

    def deserialize(self, row: EntityRow) -> AnalysisData:
        analysis = AnalysisData(
            analysis_id=row.get('analysis_id'),
            hypothesis_id=row.get('hypothesis_id'),
            # hypotheses=row.get('hypotheses'),
            analysis_metrics=row.get('analysis_metrics'),
            # test_results=row.get('test_results'),
            # metrics_card_data=row.get('metrics_card_data'),
            # customer_characteristics=row.get('customer_characteristics'),
            # purchase_behaviors=row.get('purchase_behaviors'),
            data_explain_dict=row.get('data_explain_dict')
        )
        # noinspection PyTypeChecker
        analysis: AnalysisData = AuditableShaper.deserialize(row, analysis)
        # noinspection PyTypeChecker
        analysis: AnalysisData = UserBasedTupleShaper.deserialize(row, analysis)
        return analysis


ANALYSIS_ENTITY_NAME = 'analysis'
ANALYSIS_ENTITY_SHAPER = AnalysisShaper()


class AnalysisService(UserBasedTupleService):
    def should_record_operation(self) -> bool:
        return False

    def get_entity_name(self) -> str:
        return ANALYSIS_ENTITY_NAME

    def get_entity_shaper(self) -> EntityShaper:
        return ANALYSIS_ENTITY_SHAPER

    def get_storable_id(self, storable: AnalysisData) -> str:
        return storable.analysis_id

    def set_storable_id(self, storable: AnalysisData, storable_id: str) -> AnalysisData:
        storable.analysis_id = storable_id
        return storable

    def get_storable_id_column_name(self) -> str:
        return 'analysis_id'

    def update_by_hypothesis_id(self, hypothesis_id: str, analysis_data: AnalysisData) -> AnalysisData:
        if hypothesis_id is None or len(hypothesis_id.strip()) == 0:
            raise ValueError("hypothesis_id cannot be empty")
        criteria = [
            EntityCriteriaExpression(
                left=ColumnNameLiteral(columnName='hypothesis_id'), right=hypothesis_id)
        ]
        # noinspection PyTypeChecker
        self.storage.update(self.get_entity_updater(criteria=criteria, update=self.get_entity_shaper().serialize(analysis_data)))
        return analysis_data

    def find_all(self, tenant_id: Optional[TenantId]) -> List[AnalysisData]:
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))

    def find_by_hypothesis_id(self, hypothesis_id: str, tenant_id: Optional[TenantId] = None) -> List[AnalysisData]:
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        if hypothesis_id is not None and len(hypothesis_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(
                left=ColumnNameLiteral(columnName='hypothesis_id'), right=hypothesis_id))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))
    
    # def find_by_metric_id(self, metric_id: str, tenant_id: Optional[TenantId] = None) -> List[AnalysisData]:
    #     criteria = []
    #     if tenant_id is not None and len(tenant_id.strip()) != 0:
    #         criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
    #     if metric_id is not None and len(metric_id.strip()) != 0:
    #         criteria.append(EntityCriteriaExpression(
    #             left=ColumnNameLiteral(columnName='analysis_metric.id'), operator='array_contains', right=metric_id))
    #     # noinspection PyTypeChecker
    #     return self.storage.find(self.get_entity_finder(criteria=criteria))
