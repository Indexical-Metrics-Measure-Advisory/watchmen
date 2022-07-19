from watchmen_meta.common import UserBasedTupleService, UserBasedTupleShaper
from watchmen_model.common import InspectionId
from watchmen_model.indicator import Inspection
from watchmen_storage import EntityRow, EntityShaper
from watchmen_utilities import ArrayHelper


class InspectionShaper(EntityShaper):
	def serialize(self, inspection: Inspection) -> EntityRow:
		row = {
			'inspection_id': inspection.inspectionId,
			'name': inspection.name,
			'indicator_id': inspection.indicatorId,
			'aggregate_arithmetics': inspection.aggregateArithmetics,
			'measure_on': inspection.measureOn,
			'measure_on_factor_id': inspection.measureOnFactorId,
			'measure_on_bucket_id': inspection.measureOnBucketId,
			'time_range_measure': inspection.timeRangeMeasure,
			'time_range_factor_id': inspection.timeRangeFactorId,
			'time_ranges': ArrayHelper(inspection.timeRanges).map(lambda x: x.to_dict()).to_list(),
			'measure_on_time': inspection.measureOnTime,
			'measure_on_time_factor_id': inspection.measureOnTimeFactorId,
			'criteria': ArrayHelper(inspection.criteria).map(lambda x: x.to_dict()).to_list()
		}
		row = UserBasedTupleShaper.serialize(inspection, row)
		return row

	def deserialize(self, row: EntityRow) -> Inspection:
		inspection = Inspection(
			inspectionId=row.get('inspection_id'),
			name=row.get('name'),
			indicatorId=row.get('indicator_id'),
			aggregateArithmetics=row.get('aggregate_arithmetics'),
			measureOn=row.get('measure_on'),
			measureOnFactorId=row.get('measure_on_factor_id'),
			measureOnBucketId=row.get('measure_on_bucket_id'),
			timeRangeMeasure=row.get('time_range_measure'),
			timeRangeFactorId=row.get('time_range_factor_id'),
			timeRanges=row.get('time_ranges'),
			measureOnTime=row.get('measure_on_time'),
			measureOnTimeFactorId=row.get('measure_on_time_factor_id'),
			criteria=row.get('criteria')
		)
		# noinspection PyTypeChecker
		inspection: Inspection = UserBasedTupleShaper.deserialize(row, inspection)
		return inspection


INSPECTION_ENTITY_NAME = 'inspections'
INSPECTION_ENTITY_SHAPER = InspectionShaper()


class InspectionService(UserBasedTupleService):
	def get_entity_name(self) -> str:
		return INSPECTION_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return INSPECTION_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> str:
		return 'inspection_id'

	def get_storable_id(self, storable: Inspection) -> InspectionId:
		return storable.inspectionId

	def set_storable_id(self, storable: Inspection, storable_id: InspectionId) -> Inspection:
		storable.inspectionId = storable_id
		return storable
