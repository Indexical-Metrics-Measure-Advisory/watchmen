from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.common import ConvergenceId, DataPage, Pageable, TenantId
from watchmen_model.indicator import Convergence
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaJoint, \
	EntityCriteriaJointConjunction, EntityCriteriaOperator, EntityRow, EntityShaper
from watchmen_utilities import ArrayHelper, is_not_blank


class ConvergenceShaper(EntityShaper):
	def serialize(self, convergence: Convergence) -> EntityRow:
		return TupleShaper.serialize_tenant_based(convergence, {
			'convergence_id': convergence.convergenceId,
			'name': convergence.name,
			'description': convergence.description,
			'targets': ArrayHelper(convergence.targets).map(lambda x: x.to_dict()).to_list(),
			'variables': ArrayHelper(convergence.variables).map(lambda x: x.to_dict()).to_list(),
			'group_ids': convergence.groupIds
		})

	def deserialize(self, row: EntityRow) -> Convergence:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, Convergence(
			convergenceId=row.get('convergence_id'),
			name=row.get('name'),
			description=row.get('description'),
			targets=row.get('targets'),
			variables=row.get('variables'),
			groupIds=row.get('group_ids')
		))


CONVERGENCES_ENTITY_NAME = 'convergences'
CONVERGENCES_ENTITY_SHAPER = ConvergenceShaper()


class ConvergenceService(TupleService):
	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> str:
		return CONVERGENCES_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return CONVERGENCES_ENTITY_SHAPER

	def get_storable_id(self, storable: Convergence) -> ConvergenceId:
		return storable.convergenceId

	def set_storable_id(self, storable: Convergence, storable_id: ConvergenceId) -> Convergence:
		storable.convergenceId = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'convergence_id'

	# noinspection DuplicatedCode
	def find_by_text(self, text: Optional[str], tenant_id: Optional[TenantId]) -> List[Convergence]:
		criteria = []
		if text is not None and len(text.strip()) != 0:
			criteria.append(EntityCriteriaJoint(
				conjunction=EntityCriteriaJointConjunction.OR,
				children=[
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName='name'), operator=EntityCriteriaOperator.LIKE, right=text),
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName='description'), operator=EntityCriteriaOperator.LIKE,
						right=text)
				]
			))
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))

	# noinspection DuplicatedCode
	def find_page_by_text(self, text: Optional[str], tenant_id: Optional[TenantId], pageable: Pageable) -> DataPage:
		criteria = []
		if text is not None and len(text.strip()) != 0:
			criteria.append(EntityCriteriaJoint(
				conjunction=EntityCriteriaJointConjunction.OR,
				children=[
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName='name'), operator=EntityCriteriaOperator.LIKE, right=text),
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName='description'), operator=EntityCriteriaOperator.LIKE,
						right=text)
				]
			))
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		return self.storage.page(self.get_entity_pager(criteria=criteria, pageable=pageable))

	# noinspection DuplicatedCode
	def find_by_name(self, text: Optional[str], tenant_id: Optional[TenantId]) -> List[Convergence]:
		criteria = []
		if is_not_blank(text):
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='name'), operator=EntityCriteriaOperator.LIKE, right=text.strip()))
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))

	def find_by_ids(self, convergence_ids: List[ConvergenceId], tenant_id: Optional[TenantId]) -> List[Convergence]:
		criteria = [
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='convergence_id'), operator=EntityCriteriaOperator.IN,
				right=convergence_ids)
		]
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria))

	def find_all(self, tenant_id: Optional[TenantId]) -> List[Convergence]:
		criteria = []
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))
