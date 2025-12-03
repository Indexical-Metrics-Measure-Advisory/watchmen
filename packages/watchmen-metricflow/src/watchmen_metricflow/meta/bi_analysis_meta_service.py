from typing import List, Optional

from watchmen_meta.common import UserBasedTupleService, UserBasedTupleShaper, AuditableShaper, TupleShaper, \
    LastVisitShaper
from watchmen_model.common import TenantId
from watchmen_storage import EntityShaper, EntityRow, EntityCriteriaExpression, ColumnNameLiteral
from watchmen_utilities import ArrayHelper
from ..model.bi_analysis_board import BIAnalysis, BIChartCard, BIDimensionSelection


class BIAnalysisShaper(UserBasedTupleShaper):
    @staticmethod
    def serialize_dimension_selection(selection: BIDimensionSelection) -> dict:
        if selection is None:
            return None
        if isinstance(selection, dict):
            return selection
        else:
            return selection.model_dump()

    @staticmethod
    def serialize_chart_card(card: BIChartCard) -> dict:
        if card is None:
            return None
        if isinstance(card, dict):
            return card
        else:
            # flatten nested selection and enum values
            data = card.model_dump()
            # Ensure selection is serialized as a plain dict
            if 'selection' in data and isinstance(data['selection'], BIDimensionSelection):
                data['selection'] = BIAnalysisShaper.serialize_dimension_selection(data['selection'])
            return data

    @staticmethod
    def serialize_cards(cards: Optional[List[BIChartCard]]) -> Optional[list]:
        if cards is None:
            return None
        return ArrayHelper(cards).map(lambda x: BIAnalysisShaper.serialize_chart_card(x)).to_list()

    def serialize(self, analysis: BIAnalysis) -> EntityRow:
        # Base fields + serialize cards as JSON (list[dict])
        row = {
            'id': analysis.id,
            'name': analysis.name,
            'description': analysis.description,
            'cards': BIAnalysisShaper.serialize_cards(analysis.cards)
        }

        # Append tenant and audit fields
        # row = TupleShaper.serialize_tenant_based(analysis, row)
        # row = UserBasedTupleShaper.serialize(analysis, row)
        # row = AuditableShaper.serialize(analysis, row)
        row = AuditableShaper.serialize(analysis, row)
        row = UserBasedTupleShaper.serialize(analysis, row)
        row = LastVisitShaper.serialize(analysis, row)
        return row

    def deserialize(self, row: EntityRow) -> BIAnalysis:
        # Feed stored JSON into model; let Pydantic parse enums and nesting
        analysis_data = {
            'id': row.get('id'),
            'name': row.get('name'),
            'description': row.get('description'),
            'cards': row.get('cards') or []
        }

        analysis = BIAnalysis.model_validate(analysis_data)

        # noinspection PyTypeChecker
        analysis: BIAnalysis = AuditableShaper.deserialize(row, analysis)
        # noinspection PyTypeChecker
        analysis: BIAnalysis = TupleShaper.deserialize_tenant_based(row, analysis)
        return analysis


BI_ANALYSIS_ENTITY_NAME = 'bi_analysis'
BI_ANALYSIS_ENTITY_SHAPER = BIAnalysisShaper()


class BIAnalysisService(UserBasedTupleService):
    def should_record_operation(self) -> bool:
        return False

    def get_entity_name(self) -> str:
        return BI_ANALYSIS_ENTITY_NAME

    def get_entity_shaper(self) -> EntityShaper:
        return BI_ANALYSIS_ENTITY_SHAPER

    def get_storable_id(self, storable: BIAnalysis) -> str:
        # Align with metrics: use name as the storable id (column 'name')
        return storable.id

    def set_storable_id(self, storable: BIAnalysis, storable_id: str) -> BIAnalysis:
        storable.id = storable_id
        return storable

    def get_storable_id_column_name(self) -> str:
        return 'id'

    def find_all(self, tenant_id: Optional[TenantId] = None) -> List[BIAnalysis]:
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))

    def find_by_name(self, name: str, tenant_id: Optional[TenantId] = None) -> Optional[BIAnalysis]:
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        if name is not None and len(name.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='name'), right=name))
        # noinspection PyTypeChecker
        results = self.storage.find(self.get_entity_finder(criteria=criteria))
        return results[0] if results else None

    def update_by_name(self, name: str, analysis: BIAnalysis) -> BIAnalysis:
        if name is None or len(name.strip()) == 0:
            raise ValueError('name cannot be empty')
        criteria = [EntityCriteriaExpression(left=ColumnNameLiteral(columnName='name'), right=name)]
        # noinspection PyTypeChecker
        self.storage.update(self.get_entity_updater(criteria=criteria, update=self.get_entity_shaper().serialize(analysis)))
        return analysis

    def delete_by_name(self, name: str, tenant_id: Optional[TenantId] = None) -> None:
        if name is None or len(name.strip()) == 0:
            raise ValueError('name cannot be empty')
        criteria = [EntityCriteriaExpression(left=ColumnNameLiteral(columnName='name'), right=name)]
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        # noinspection PyTypeChecker
        self.storage.delete(self.get_entity_deleter(criteria=criteria))
