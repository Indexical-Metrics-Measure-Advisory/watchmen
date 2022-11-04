from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.common import DataPage, Pageable, PluginId, TenantId
from watchmen_model.system import Plugin, PluginApplyTo
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaOperator, EntityRow, \
	EntityShaper


class PluginShaper(EntityShaper):
	def serialize(self, plugin: Plugin) -> EntityRow:
		return TupleShaper.serialize_tenant_based(plugin, {
			'plugin_id': plugin.pluginId,
			'plugin_code': plugin.pluginCode,
			'name': plugin.name,
			'type': plugin.type,
			'apply_to': plugin.applyTo,
			'params': plugin.params,
			'results': plugin.results
		})

	def deserialize(self, row: EntityRow) -> Plugin:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, Plugin(
			pluginId=row.get('plugin_id'),
			pluginCode=row.get('plugin_code'),
			name=row.get('name'),
			type=row.get('type'),
			applyTo=row.get('apply_to'),
			params=row.get('params'),
			results=row.get('results')
		))


PLUGIN_ENTITY_NAME = 'plugins'
PLUGIN_ENTITY_SHAPER = PluginShaper()


class PluginService(TupleService):
	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> str:
		return PLUGIN_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return PLUGIN_ENTITY_SHAPER

	def get_storable_id(self, storable: Plugin) -> PluginId:
		return storable.pluginId

	def set_storable_id(self, storable: Plugin, storable_id: PluginId) -> Plugin:
		storable.pluginId = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'plugin_id'

	# noinspection DuplicatedCode
	def find_by_text(
			self, text: Optional[str], tenant_id: Optional[TenantId], pageable: Pageable) -> DataPage:
		criteria = []
		if text is not None and len(text.strip()) != 0:
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='name'), operator=EntityCriteriaOperator.LIKE, right=text))
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		return self.storage.page(self.get_entity_pager(criteria, pageable))

	def find_all(self, tenant_id: Optional[TenantId]) -> List[Plugin]:
		criteria = []
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria))

	def find_all_achievement(self, tenant_id: Optional[TenantId]) -> List[Plugin]:
		criteria = [
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='apply_to'), right=PluginApplyTo.ACHIEVEMENT.value)
		]
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria))
