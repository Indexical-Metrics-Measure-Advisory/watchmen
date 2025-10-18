from typing import List, Optional

from watchmen_ai.hypothesis.model.analysis import HypothesisWithMetrics
from watchmen_ai.hypothesis.model.hypothesis import Hypothesis
from watchmen_ai.hypothesis.model.metrics import MetricDetailType
from watchmen_meta.common import TupleService, UserBasedTupleShaper, AuditableShaper
from watchmen_model.common import TenantId
from watchmen_storage import EntityShaper, EntityRow, EntityCriteriaExpression, ColumnNameLiteral
from watchmen_utilities import ArrayHelper


class HypothesisShaper(UserBasedTupleShaper):

    @staticmethod
    def serialize_metric_detail(metric_detail: MetricDetailType) -> dict:
        if isinstance(metric_detail, dict):
            return metric_detail
        else:
            return metric_detail.model_dump()

    @staticmethod
    def serialize_metric_details(metric_details: Optional[List[MetricDetailType]]) -> Optional[list]:
        if metric_details is None:
            return None
        return ArrayHelper(metric_details).map(lambda x: HypothesisShaper.serialize_metric_detail(x)).to_list()




    def serialize(self, hypothesis: HypothesisWithMetrics) -> EntityRow:
        row = {
            'id': hypothesis.id,
            'title': hypothesis.title,
            'description': hypothesis.description,
            'status': hypothesis.status,
            'metrics': hypothesis.metrics,
            'analysis_method':hypothesis.analysisMethod,
            'business_problem_id': hypothesis.businessProblemId,
            'confidence': hypothesis.confidence,
            'related_hypotheses_ids': hypothesis.relatedHypothesesIds,
            "metrics_details":HypothesisShaper.serialize_metric_details(hypothesis.metrics_details)
        }

        row = AuditableShaper.serialize(hypothesis, row)
        row = UserBasedTupleShaper.serialize(hypothesis, row)
        return row

    def deserialize(self, row: EntityRow) -> Hypothesis:

        hypothesis = HypothesisWithMetrics(
            id=row.get('id'),
            title=row.get('title'),
            description=row.get('description'),
            status=row.get('status'),
            analysisMethod=row.get('analysis_method'),
            metrics = row.get('metrics'),
            businessProblemId = row.get('business_problem_id'),
            confidence = row.get('confidence'),
            relatedHypothesesIds = row.get('related_hypotheses_ids'),
            metrics_details= row.get('metrics_details')
        )
        # noinspection PyTypeChecker
        hypothesis: HypothesisWithMetrics = AuditableShaper.deserialize(row, hypothesis)
        # noinspection PyTypeChecker
        hypothesis: HypothesisWithMetrics = UserBasedTupleShaper.deserialize(row, hypothesis)

        return hypothesis


HYPOTHESIS_ENTITY_NAME = 'hypotheses'
HYPOTHESIS_ENTITY_SHAPER = HypothesisShaper()


class HypothesisService(TupleService):
    def should_record_operation(self) -> bool:
        return False

    def get_entity_name(self) -> str:
        return HYPOTHESIS_ENTITY_NAME

    def get_entity_shaper(self) -> EntityShaper:
        return HYPOTHESIS_ENTITY_SHAPER

    def get_storable_id(self, storable: HypothesisWithMetrics) -> str:
        return storable.id

    def set_storable_id(self, storable: HypothesisWithMetrics, storable_id: str) -> HypothesisWithMetrics:
        storable.id = storable_id
        return storable

    def get_storable_id_column_name(self) -> str:
        return 'id'

    def find_all(self, tenant_id: Optional[TenantId]) -> List[HypothesisWithMetrics]:
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))

    def find_list_and_limit(self, tenant_id: Optional[TenantId], limit: int) -> List[HypothesisWithMetrics]:
        ## order by insert time

        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria).limit(limit))


    def find_by_problem_id(self, problem_id: str, tenant_id: Optional[TenantId] = None) -> List[HypothesisWithMetrics]:
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='business_problem_id'), right=problem_id))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))





