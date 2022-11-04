from typing import Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.common import AchievementId, DataPage, Pageable, TenantId
from watchmen_model.indicator import Achievement
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaJoint, \
	EntityCriteriaJointConjunction, EntityCriteriaOperator, EntityRow, EntityShaper
from watchmen_utilities import ArrayHelper


class AchievementShaper(EntityShaper):
	def serialize(self, achievement: Achievement) -> EntityRow:
		return TupleShaper.serialize_tenant_based(achievement, {
			'achievement_id': achievement.achievementId,
			'name': achievement.name,
			'description': achievement.description,
			'time_range_type': achievement.timeRangeType,
			'time_range_year': achievement.timeRangeYear,
			'time_range_month': achievement.timeRangeMonth,
			'compare_with_prev_time_range': achievement.compareWithPreviousTimeRange,
			'final_score_is_ratio': achievement.finalScoreIsRatio,
			'indicators': ArrayHelper(achievement.indicators).map(lambda x: x.to_dict()).to_list(),
			'plugin_ids': achievement.pluginIds
		})

	def deserialize(self, row: EntityRow) -> Achievement:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, Achievement(
			achievementId=row.get('achievement_id'),
			name=row.get('name'),
			description=row.get('description'),
			timeRangeType=row.get('time_range_type'),
			timeRangeYear=row.get('time_range_year'),
			timeRangeMonth=row.get('time_range_month'),
			compareWithPreviousTimeRange=row.get('compare_with_prev_time_range'),
			finalScoreIsRatio=row.get('final_score_is_ratio'),
			indicators=row.get('indicators'),
			pluginIds=row.get('plugin_ids')
		))


ACHIEVEMENT_ENTITY_NAME = 'achievements'
ACHIEVEMENT_ENTITY_SHAPER = AchievementShaper()


class AchievementService(TupleService):
	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> str:
		return ACHIEVEMENT_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return ACHIEVEMENT_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> str:
		return 'achievement_id'

	def get_storable_id(self, storable: Achievement) -> AchievementId:
		return storable.achievementId

	def set_storable_id(self, storable: Achievement, storable_id: AchievementId) -> Achievement:
		storable.achievementId = storable_id
		return storable

	# noinspection DuplicatedCode
	def find_page_by_text(
			self, text: Optional[str], tenant_id: Optional[TenantId], pageable: Pageable) -> DataPage:
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
