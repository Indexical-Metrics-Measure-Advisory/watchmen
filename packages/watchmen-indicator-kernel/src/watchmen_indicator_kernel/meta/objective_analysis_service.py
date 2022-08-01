from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.common import ObjectiveAnalysisId
from watchmen_model.indicator import ObjectiveAnalysis
from watchmen_storage import EntityRow, EntityShaper
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
