from typing import List, Optional

from watchmen_ai.dspy.model.data_story import DataStory
from watchmen_meta.common import TupleShaper, TupleService
from watchmen_model.common import TenantId
from watchmen_storage import EntityRow, EntityShaper, EntityCriteriaExpression, ColumnNameLiteral
from watchmen_utilities import ArrayHelper


class DataStoryShaper(EntityShaper):
    # noinspection PyMethodMayBeStatic

    def serialize(self, data_story: DataStory) -> EntityRow:
        return TupleShaper.serialize_tenant_based(data_story, {
            "data_story_id": data_story.dataStoryId,
            'document_name': data_story.documentName,
            "status": data_story.status,
            'business_question': data_story.businessQuestion.to_dict(),
            'sub_questions': ArrayHelper(data_story.subQuestions).map(lambda x: x.dict()).to_list(),
            'dimensions': ArrayHelper(data_story.dimensions).map(lambda x: x.dict()).to_list(),
        })

    # noinspection PyMethodMayBeStatic

    def deserialize(self, row: EntityRow) -> DataStory:
        # noinspection PyTypeChecker
        return TupleShaper.deserialize_tenant_based(row, DataStory(
            businessQuestion=row.get('business_question'),
            subQuestions=row.get('sub_questions'),
            status=row.get('status'),
            dimensions=row.get('dimensions'),
            dataStoryId=row.get('data_story_id'),
            documentName=row.get('document_name')
        ))


DOCUMENT_ENTITY_NAME = 'data_stories'
DOCUMENT_ENTITY_SHAPER = DataStoryShaper()


class DataStoryService(TupleService):
    def should_record_operation(self) -> bool:
        return False

    def get_entity_name(self) -> str:
        return DOCUMENT_ENTITY_NAME

    def get_entity_shaper(self) -> EntityShaper:
        return DOCUMENT_ENTITY_SHAPER

    def get_storable_id(self, storable: DataStory) -> str:
        return storable.dataStoryId

    def set_storable_id(self, storable: DataStory, storable_id: str) -> DataStory:
        storable.dataStoryId = storable_id
        return storable

    def get_storable_id_column_name(self) -> str:
        return 'data_story_id'

    def find_all(self, tenant_id: Optional[TenantId]) -> List[DataStory]:
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))

    def find_by_name(self, document_name: str, tenant_id: Optional[TenantId]) -> DataStory:
        criteria = [EntityCriteriaExpression(left=ColumnNameLiteral(columnName='document_name'), right=document_name)]
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        return self.storage.find_one(self.get_entity_finder(criteria=criteria))
