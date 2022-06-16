from typing import List, Optional

from watchmen_meta.common import LastVisitShaper, UserBasedTupleService, UserBasedTupleShaper
from watchmen_model.common import ObjectiveAnalysisId, TenantId, UserId
from watchmen_model.indicator import ObjectiveAnalysis
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityRow, EntityShaper
from watchmen_utilities import ArrayHelper


class ObjectiveAnalysisShaper(EntityShaper):
	def serialize(self, analysis: ObjectiveAnalysis) -> EntityRow:
		row = {
			'analysis_id': analysis.analysisId,
			'title': analysis.title,
			'description': analysis.description,
			'perspectives': ArrayHelper(analysis.perspectives).map(lambda x: x.to_dict()).to_list()
		}
		row = UserBasedTupleShaper.serialize(analysis, row)
		row = LastVisitShaper.serialize(analysis, row)
		return row

	def deserialize(self, row: EntityRow) -> ObjectiveAnalysis:
		analysis = ObjectiveAnalysis(
			analysisId=row.get('analysis_id'),
			title=row.get('title'),
			description=row.get('description'),
			perspectives=row.get('perspectives')
		)
		# noinspection PyTypeChecker
		analysis: ObjectiveAnalysis = UserBasedTupleShaper.deserialize(row, analysis)
		# noinspection PyTypeChecker
		analysis: ObjectiveAnalysis = LastVisitShaper.deserialize(row, analysis)
		return analysis


OBJECTIVE_ANALYSIS_ENTITY_NAME = 'objective_analysis'
OBJECTIVE_ANALYSIS_ENTITY_SHAPER = ObjectiveAnalysisShaper()


class ObjectiveAnalysisService(UserBasedTupleService):
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
