from typing import List, Optional

from watchmen_ai.hypothesis.model.business import BusinessChallenge
from watchmen_meta.common import UserBasedTupleService, UserBasedTupleShaper, AuditableShaper
from watchmen_model.common import TenantId
from watchmen_storage import EntityShaper, EntityRow, EntityCriteriaExpression, ColumnNameLiteral


class BusinessChallengeShaper(UserBasedTupleShaper):
    def serialize(self, challenge: BusinessChallenge) -> EntityRow:
        row= {
            'id': challenge.id,
            'title': challenge.title,
            'description': challenge.description,
            'problemIds': challenge.problemIds,
        }

        row = AuditableShaper.serialize(challenge, row)
        row = UserBasedTupleShaper.serialize(challenge, row)
        return row

    def deserialize(self, row: EntityRow) -> BusinessChallenge:
        challenge = BusinessChallenge(
                id=row.get('id'),
                title=row.get('title'),
                description=row.get('description'),
                problemIds=row.get('problemIds'),

            )
        # noinspection PyTypeChecker
        challenge: BusinessChallenge = AuditableShaper.deserialize(row, challenge)
        # noinspection PyTypeChecker
        challenge: BusinessChallenge = UserBasedTupleShaper.deserialize(row, challenge)

        return challenge


BUSINESS_CHALLENGE_ENTITY_NAME = 'business_challenges'
BUSINESS_CHALLENGE_ENTITY_SHAPER = BusinessChallengeShaper()


class BusinessChallengeService(UserBasedTupleService):
    def should_record_operation(self) -> bool:
        return False

    def get_entity_name(self) -> str:
        return BUSINESS_CHALLENGE_ENTITY_NAME

    def get_entity_shaper(self) -> EntityShaper:
        return BUSINESS_CHALLENGE_ENTITY_SHAPER

    def get_storable_id(self, storable: BusinessChallenge) -> str:
        return storable.id

    def set_storable_id(self, storable: BusinessChallenge, storable_id: str) -> BusinessChallenge:
        storable.id = storable_id
        return storable

    def get_storable_id_column_name(self) -> str:
        return 'id'

    def find_all(self, tenant_id: Optional[TenantId]) -> List[BusinessChallenge]:
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))