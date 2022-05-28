from typing import Optional

from watchmen_meta.common import UserBasedTupleService, UserBasedTupleShaper
from watchmen_model.common import DataPage, NavigationId, Pageable, TenantId, UserId
from watchmen_model.indicator import Navigation
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaJoint, \
	EntityCriteriaJointConjunction, EntityCriteriaOperator, EntityRow, EntityShaper
from watchmen_utilities import ArrayHelper


class NavigationShaper(EntityShaper):
	def serialize(self, navigation: Navigation) -> EntityRow:
		row = {
			'navigation_id': navigation.navigationId,
			'name': navigation.name,
			'description': navigation.description,
			'time_range_type': navigation.timeRangeType,
			'time_range_year': navigation.timeRangeYear,
			'time_range_month': navigation.timeRangeMonth,
			'compare_with_prev_time_range': navigation.compareWithPreviousTimeRange,
			'indicators': ArrayHelper(navigation.indicators).map(lambda x: x.to_dict()).to_list()
		}
		row = UserBasedTupleShaper.serialize(navigation, row)
		return row

	def deserialize(self, row: EntityRow) -> Navigation:
		navigation = Navigation(
			navigationId=row.get('navigation_id'),
			name=row.get('name'),
			description=row.get('description'),
			timeRangeType=row.get('time_range_type'),
			timeRangeYear=row.get('time_range_year'),
			timeRangeMonth=row.get('time_range_month'),
			compareWithPreviousTimeRange=row.get('compare_with_prev_time_range'),
			indicators=row.get('indicators')
		)
		# noinspection PyTypeChecker
		navigation: Navigation = UserBasedTupleShaper.deserialize(row, navigation)
		return navigation


NAVIGATION_ENTITY_NAME = 'navigations'
NAVIGATION_ENTITY_SHAPER = NavigationShaper()


class NavigationService(UserBasedTupleService):
	def get_entity_name(self) -> str:
		return NAVIGATION_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return NAVIGATION_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> str:
		return 'navigation_id'

	def get_storable_id(self, storable: Navigation) -> NavigationId:
		return storable.navigationId

	def set_storable_id(self, storable: Navigation, storable_id: NavigationId) -> Navigation:
		storable.navigationId = storable_id
		return storable

	# noinspection DuplicatedCode
	def find_page_by_text(
			self, text: Optional[str], user_id: Optional[UserId], tenant_id: Optional[TenantId],
			pageable: Pageable) -> DataPage:
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
		if user_id is not None and len(user_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='user_id'), right=user_id))
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		return self.storage.page(self.get_entity_pager(criteria=criteria, pageable=pageable))
