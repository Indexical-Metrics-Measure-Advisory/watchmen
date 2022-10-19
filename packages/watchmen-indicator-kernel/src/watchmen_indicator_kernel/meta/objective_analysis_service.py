from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.common import DataPage, ObjectiveAnalysisId, Pageable, TenantId
from watchmen_model.indicator import ObjectiveAnalysis
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaJoint, \
	EntityCriteriaJointConjunction, EntityCriteriaOperator, EntityRow, EntityShaper
from watchmen_utilities import ArrayHelper


class ObjectiveAnalysisShaper(EntityShaper):
	def serialize(self, analysis: ObjectiveAnalysis) -> EntityRow:
		return TupleShaper.serialize_tenant_based(analysis, {
			'analysis_id': analysis.analysisId,
			'title': analysis.title,
			'description': analysis.description,
			'perspectives': ArrayHelper(analysis.perspectives).map(lambda x: x.to_dict()).to_list()
		})

	def deserialize(self, row: EntityRow) -> ObjectiveAnalysis:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, ObjectiveAnalysis(
			analysisId=row.get('analysis_id'),
			title=row.get('title'),
			description=row.get('description'),
			perspectives=row.get('perspectives')
		))


OBJECTIVE_ANALYSIS_ENTITY_NAME = 'objective_analysis'
OBJECTIVE_ANALYSIS_ENTITY_SHAPER = ObjectiveAnalysisShaper()


class ObjectiveAnalysisService(TupleService):
	def get_entity_name(self) -> str:
		return OBJECTIVE_ANALYSIS_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return OBJECTIVE_ANALYSIS_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> str:
		return 'analysis_id'

	def get_storable_id(self, storable: ObjectiveAnalysis) -> ObjectiveAnalysisId:
		return storable.analysisId

	def set_storable_id(self, storable: ObjectiveAnalysis, storable_id: ObjectiveAnalysisId) -> ObjectiveAnalysis:
		storable.analysisId = storable_id
		return storable

	def find_all(self, tenant_id: TenantId) -> List[ObjectiveAnalysis]:
		criteria = []
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))

	def find_page_by_text(self, text: Optional[str], tenant_id: Optional[TenantId], pageable: Pageable) -> DataPage:
		criteria = []
		if text is not None and len(text.strip()) != 0:
			criteria.append(EntityCriteriaJoint(
				conjunction=EntityCriteriaJointConjunction.OR,
				children=[
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName='title'), operator=EntityCriteriaOperator.LIKE, right=text),
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName='description'), operator=EntityCriteriaOperator.LIKE,
						right=text)
				]
			))
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		return self.storage.page(self.get_entity_pager(criteria=criteria, pageable=pageable))
