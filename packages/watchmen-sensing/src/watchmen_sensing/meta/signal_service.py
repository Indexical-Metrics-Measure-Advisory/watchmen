from typing import List, Optional

from watchmen_meta.common import UserBasedTupleService, UserBasedTupleShaper
from watchmen_model.common import DataPage, Pageable, TenantId
from watchmen_storage import (
	ColumnNameLiteral, EntityCriteriaExpression, EntityShaper, EntityRow, EntitySortColumn, EntitySortMethod
)
from watchmen_utilities import is_not_blank

from watchmen_sensing.common.constants import SIGNAL_ENTITY_NAME
from watchmen_sensing.model.signal import (
	Signal, SignalCategory, SignalQuery, SignalStatus
)


def _dump(value) -> Optional[dict]:
	"""Serialize a nested ExtendedBaseModel to a dict, tolerant of None."""
	if value is None:
		return None
	if hasattr(value, 'model_dump'):
		return value.model_dump()
	return value


def _asset_matches(signal: Signal, asset_type: Optional[str], asset_id: Optional[str]) -> bool:
	"""In-memory asset filter for signals (asset is a JSON column)."""
	asset = getattr(signal, 'asset', None)
	if asset is None:
		return False
	if is_not_blank(asset_type) and getattr(asset, 'type', None) != asset_type:
		return False
	if is_not_blank(asset_id) and str(getattr(asset, 'id', None)) != asset_id:
		return False
	return True


class SignalShaper(UserBasedTupleShaper):
	def serialize(self, signal: Signal) -> EntityRow:
		row = {
			'signal_id': signal.signalId,
			'signal_type': signal.signalType,
			'category': signal.category,
			'timestamp': signal.timestamp,
			'asset': _dump(signal.asset),
			'ontology': _dump(signal.ontology),
			'severity': signal.severity,
			'confidence': signal.confidence,
			'evidence': _dump(signal.evidence),
			'impact': _dump(signal.impact),
			'context': _dump(signal.context),
			'recommended_actions': _dump(signal.recommendedActions),
			'status': signal.status,
			'root_cause': signal.rootCause,
			'source': signal.source,
		}
		# noinspection PyTypeChecker
		row = UserBasedTupleShaper.serialize(signal, row)
		return row

	def deserialize(self, row: EntityRow) -> Signal:
		signal = Signal(
			signalId=row.get('signal_id'),
			signalType=row.get('signal_type'),
			category=row.get('category'),
			timestamp=row.get('timestamp'),
			asset=row.get('asset'),
			ontology=row.get('ontology'),
			severity=row.get('severity'),
			confidence=row.get('confidence'),
			evidence=row.get('evidence'),
			impact=row.get('impact'),
			context=row.get('context'),
			recommendedActions=row.get('recommended_actions'),
			status=row.get('status'),
			rootCause=row.get('root_cause'),
			source=row.get('source'),
		)
		# noinspection PyTypeChecker
		signal: Signal = UserBasedTupleShaper.deserialize(row, signal)
		return signal


SIGNAL_ENTITY_SHAPER = SignalShaper()


class SignalService(UserBasedTupleService):
	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> str:
		return SIGNAL_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return SIGNAL_ENTITY_SHAPER

	def get_storable_id(self, storable: Signal) -> str:
		return storable.signalId

	def set_storable_id(self, storable: Signal, storable_id: str) -> Signal:
		storable.signalId = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'signal_id'

	def find_by_id(self, signal_id: str, tenant_id: Optional[TenantId] = None) -> Optional[Signal]:
		criteria = [
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='signal_id'), right=signal_id),
		]
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find_one(self.get_entity_finder(criteria=criteria))

	def find_by_tenant(self, tenant_id: TenantId, pageable: Pageable) -> DataPage:
		criteria = [
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id),
		]
		return self.storage.page(self.get_entity_pager(
			criteria=criteria, pageable=pageable,
			sort=[EntitySortColumn(name='timestamp', method=EntitySortMethod.DESC)]
		))

	def find_by_query(self, query: SignalQuery) -> DataPage:
		criteria = []
		if is_not_blank(query.tenantId):
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='tenant_id'), right=query.tenantId))
		if query.category is not None:
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='category'), right=query.category))
		if query.severity is not None:
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='severity'), right=query.severity))
		if query.status is not None:
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='status'), right=query.status))
		if is_not_blank(query.signalType):
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='signal_type'), right=query.signalType))
		pageable = Pageable(
			pageNumber=query.pageNumber or 1, pageSize=query.pageSize or 20
		)
		page = self.storage.page(self.get_entity_pager(
			criteria=criteria, pageable=pageable,
			sort=[EntitySortColumn(name='timestamp', method=EntitySortMethod.DESC)]
		))
		# ``asset`` is a JSON column, so assetType/assetId cannot be pushed to the
		# DB. Filter in memory rather than silently ignoring the criteria (matches
		# the find_recent_by_asset pattern). Note: pagination becomes approximate
		# when an asset filter is active.
		if is_not_blank(query.assetType) or is_not_blank(query.assetId):
			page.data = [
				s for s in (page.data or [])
				if _asset_matches(s, query.assetType, query.assetId)
			]
			page.itemCount = len(page.data)
		return page

	def find_recent_by_asset(
			self, asset_type: str, asset_id: str, tenant_id: TenantId, limit: int = 5
	) -> List[Signal]:
		# NOTE: relies on tenant + asset equality; asset is a JSON column so equality
		# is matched via the storage backend's JSON handling. For backends without
		# JSON equality this returns recent tenant signals filtered in memory.
		finder = self.get_entity_finder(
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id),
			],
			sort=[EntitySortColumn(name='timestamp', method=EntitySortMethod.DESC)]
		)
		# noinspection PyTypeChecker
		found: List[Signal] = self.storage.find(finder)
		matched = [s for s in found if s.asset is not None and s.asset.type == asset_type and s.asset.id == asset_id]
		return matched[:limit]

	def find_by_status(self, status: SignalStatus, tenant_id: TenantId) -> List[Signal]:
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='status'), right=status),
			],
			sort=[EntitySortColumn(name='timestamp', method=EntitySortMethod.DESC)]
		))

	def find_by_category(
			self, category: SignalCategory, tenant_id: TenantId, limit: int = 50
	) -> List[Signal]:
		# noinspection PyTypeChecker
		found: List[Signal] = self.storage.find(self.get_entity_finder(
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='category'), right=category),
			],
			sort=[EntitySortColumn(name='timestamp', method=EntitySortMethod.DESC)]
		))
		return found[:limit]
