from typing import Optional

from watchmen_meta.common import TupleShaper, TupleService
from watchmen_model.admin.notebook import Notebook
from watchmen_model.common.tuple_ids import NotebookId, TenantId
from watchmen_storage import EntityShaper, EntityRow, EntityCriteriaExpression, ColumnNameLiteral, \
    EntityCriteriaOperator


class NotebookShaper(EntityShaper):
    def serialize(self, notebook: Notebook) -> EntityRow:
        return TupleShaper.serialize_tenant_based(notebook, {
            'notebook_id': notebook.notebookId,
            'name': notebook.name,
            'storage_location': notebook.storageLocation,
            'storage_type': notebook.storageType,
            'environment': notebook.environment,
            'dependencies': notebook.dependencies,
        })

    def deserialize(self, row: EntityRow) -> Notebook:
        # noinspection PyTypeChecker
        return TupleShaper.deserialize_tenant_based(row, Notebook(
            notebookId=row.get('notebook_id'),
            name=row.get('name'),
            storageLocation=row.get('storage_location'),
            storageType=row.get('storage_type'),
            environment=row.get('environment'),
            dependencies=row.get('dependencies')
        ))


NOTEBOOK_ENTITY_NAME = 'notebooks'

NOTEBOOK_ENTITY_SHAPER = NotebookShaper()


class NotebookService(TupleService):
    def get_entity_name(self) -> str:
        return NOTEBOOK_ENTITY_NAME

    def get_entity_shaper(self) -> EntityShaper:
        return NOTEBOOK_ENTITY_SHAPER

    def get_storable_id(self, storable: Notebook) -> NotebookId:
        return storable.notebookId

    def set_storable_id(self, storable: Notebook, storable_id: NotebookId) -> Notebook:
        storable.notebookId = storable_id
        return storable

    def get_storable_id_column_name(self) -> str:
        return 'notebook_id'

    def find_by_name(
            self, name: Optional[str],
            tenant_id: Optional[TenantId]) -> Notebook:
        criteria = []
        if name is not None and len(name.strip()) != 0:
            criteria.append(EntityCriteriaExpression(
                left=ColumnNameLiteral(columnName='name'), operator=EntityCriteriaOperator.EQUALS, right=name))

        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        # noinspection PyTypeChecker
        result = self.storage.find_one(self.get_entity_finder(criteria=criteria))
        return  result
