from typing import List, Optional

from watchmen_ai.hypothesis.model.business import BusinessProblem
from watchmen_meta.common import UserBasedTupleShaper, AuditableShaper, UserBasedTupleService
from watchmen_model.common import TenantId
from watchmen_storage import EntityShaper, EntityRow, EntityCriteriaExpression, ColumnNameLiteral


class BusinessProblemShaper(UserBasedTupleShaper):
    def serialize(self, problem: BusinessProblem) -> EntityRow:
        row = {
            'id': problem.id,
            'title': problem.title,
            'description': problem.description,
            'status': problem.status,
            'hypothesisIds': problem.hypothesisIds,
            'businessChallengeId': problem.businessChallengeId,
            "dataset_end_date":problem.datasetEndDate,
            "dataset_start_date":problem.datasetStartDate,
            'aiAnswer':problem.aiAnswer
        }

        row = AuditableShaper.serialize(problem, row)
        row = UserBasedTupleShaper.serialize(problem, row)
        return row

    def deserialize(self, row: EntityRow) -> BusinessProblem:
        problem = BusinessProblem(
            id=row.get('id'),
            title=row.get('title'),
            businessChallengeId = row.get('businessChallengeId'),
            description=row.get('description'),
            datasetEndDate = row.get("dataset_end_date"),
            datasetStartDate = row.get("dataset_start_date"),
            status=row.get('status'),
            hypothesisIds=row.get('hypothesisIds'),
            aiAnswer = row.get('aiAnswer')
        )
        # noinspection PyTypeChecker
        problem: BusinessProblem = AuditableShaper.deserialize(row, problem)
        # noinspection PyTypeChecker
        problem: BusinessProblem = UserBasedTupleShaper.deserialize(row, problem)

        return problem


BUSINESS_PROBLEM_ENTITY_NAME = 'business_problems'
BUSINESS_PROBLEM_ENTITY_SHAPER = BusinessProblemShaper()


class BusinessProblemService(UserBasedTupleService):
    def should_record_operation(self) -> bool:
        return False

    def get_entity_name(self) -> str:
        return BUSINESS_PROBLEM_ENTITY_NAME

    def get_entity_shaper(self) -> EntityShaper:
        return BUSINESS_PROBLEM_ENTITY_SHAPER

    def get_storable_id(self, storable: BusinessProblem) -> str:
        return storable.id

    def set_storable_id(self, storable: BusinessProblem, storable_id: str) -> BusinessProblem:
        storable.id = storable_id
        return storable

    def get_storable_id_column_name(self) -> str:
        return 'id'

    def find_all(self, tenant_id: Optional[TenantId]) -> List[BusinessProblem]:
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))


    def find_by_challenge_id(self, challenge_id: str, tenant_id: Optional[TenantId] = None) -> List[BusinessProblem]:
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='businessChallengeId'), right=challenge_id))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))

