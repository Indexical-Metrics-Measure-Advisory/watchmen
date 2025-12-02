from typing import List, Optional

from watchmen_meta.common import UserBasedTupleService, UserBasedTupleShaper, AuditableShaper, TupleShaper
from watchmen_model.common import TenantId
from watchmen_storage import EntityShaper, EntityRow, EntityCriteriaExpression, ColumnNameLiteral
from ..model.metric_category import Category


class CategoryShaper(UserBasedTupleShaper):
    def serialize(self, category: Category) -> EntityRow:
        row = {
            'id': category.id,
            'name': category.name,
            'description': category.description,
            'color': category.color,
            'icon': category.icon,
            # 'is_active': category.is_active,
            # 'sort_order': category.sort_order
        }

        # Append tenant and audit fields
        row = TupleShaper.serialize_tenant_based(category, row)
        row = AuditableShaper.serialize(category, row)
        return row

    def deserialize(self, row: EntityRow) -> Category:
        category_data = {
            'id': row.get('id'),
            'name': row.get('name'),
            'description': row.get('description'),
            'color': row.get('color'),
            'icon': row.get('icon'),
            'is_active': row.get('is_active'),
            'sort_order': row.get('sort_order')
        }

        category = Category.model_validate(category_data)

        # noinspection PyTypeChecker
        category: Category = AuditableShaper.deserialize(row, category)
        # noinspection PyTypeChecker
        category: Category = TupleShaper.deserialize_tenant_based(row, category)
        return category


CATEGORY_ENTITY_NAME = 'metric_categories'
CATEGORY_ENTITY_SHAPER = CategoryShaper()


class CategoryService(UserBasedTupleService):
    def should_record_operation(self) -> bool:
        return False

    def get_entity_name(self) -> str:
        return CATEGORY_ENTITY_NAME

    def get_entity_shaper(self) -> EntityShaper:
        return CATEGORY_ENTITY_SHAPER

    def get_storable_id(self, storable: Category) -> str:
        # Align with metrics: use name as the storable id (column 'name')
        return storable.id

    def set_storable_id(self, storable: Category, storable_id: str) -> Category:
        storable.id = storable_id
        return storable

    def get_storable_id_column_name(self) -> str:
        return 'id'

    def find_all(self, tenant_id: Optional[TenantId] = None) -> List[Category]:
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))

    def find_by_name(self, name: str, tenant_id: Optional[TenantId] = None) -> Optional[Category]:
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        if name is not None and len(name.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='name'), right=name))
        # noinspection PyTypeChecker
        results = self.storage.find(self.get_entity_finder(criteria=criteria))
        return results[0] if results else None

    def update_by_name(self, name: str, category: Category) -> Category:
        if name is None or len(name.strip()) == 0:
            raise ValueError('name cannot be empty')
        criteria = [EntityCriteriaExpression(left=ColumnNameLiteral(columnName='name'), right=name)]
        # noinspection PyTypeChecker
        self.storage.update(self.get_entity_updater(criteria=criteria, update=self.get_entity_shaper().serialize(category)))
        return category

    def delete_by_name(self, name: str, tenant_id: Optional[TenantId] = None) -> None:
        if name is None or len(name.strip()) == 0:
            raise ValueError('name cannot be empty')
        criteria = [EntityCriteriaExpression(left=ColumnNameLiteral(columnName='name'), right=name)]
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        # noinspection PyTypeChecker
        self.storage.delete(self.get_entity_deleter(criteria=criteria))
