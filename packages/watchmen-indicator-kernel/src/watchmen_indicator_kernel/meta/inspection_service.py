from typing import List

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.common import InspectionId, TenantId
from watchmen_model.indicator import Inspection
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityRow, EntityShaper
from watchmen_utilities import ArrayHelper


class InspectionShaper(EntityShaper):
	def serialize(self, inspection: Inspection) -> EntityRow:
		return TupleShaper.serialize_tenant_based(inspection, {
			'inspection_id': inspection.inspectionId,
			'name': inspection.name,
			'indicator_id': inspection.indicatorId,
			'aggregate_arithmetics': inspection.aggregateArithmetics,
			'measures': ArrayHelper(inspection.measures).map(lambda x: x.to_dict()).to_list(),
			'time_range_measure': inspection.timeRangeMeasure,
			'time_range_factor_id': inspection.timeRangeFactorId,
			'time_ranges': ArrayHelper(inspection.timeRanges).map(lambda x: x.to_dict()).to_list(),
			'measure_on_time': inspection.measureOnTime,
			'measure_on_time_factor_id': inspection.measureOnTimeFactorId,
			'criteria': ArrayHelper(inspection.criteria).map(lambda x: x.to_dict()).to_list()
		})

	def deserialize(self, row: EntityRow) -> Inspection:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, Inspection(
			inspectionId=row.get('inspection_id'),
			name=row.get('name'),
			indicatorId=row.get('indicator_id'),
			aggregateArithmetics=row.get('aggregate_arithmetics'),
			measures=row.get('measures'),
			timeRangeMeasure=row.get('time_range_measure'),
			timeRangeFactorId=row.get('time_range_factor_id'),
			timeRanges=row.get('time_ranges'),
			measureOnTime=row.get('measure_on_time'),
			measureOnTimeFactorId=row.get('measure_on_time_factor_id'),
			criteria=row.get('criteria')
		))


INSPECTION_ENTITY_NAME = 'inspections'
INSPECTION_ENTITY_SHAPER = InspectionShaper()


class InspectionService(TupleService):
	def should_record_operation(self) -> bool:
		return False

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

	def find_all(self, tenant_id: TenantId) -> List[Inspection]:
		criteria = []
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))
