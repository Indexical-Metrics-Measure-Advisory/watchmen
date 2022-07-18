from typing import Optional

from watchmen_meta.common import UserBasedTupleService, UserBasedTupleShaper
from watchmen_model.common import AchievementId, DataPage, Pageable, TenantId, UserId
from watchmen_model.indicator import Achievement
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaJoint, \
	EntityCriteriaJointConjunction, EntityCriteriaOperator, EntityRow, EntityShaper
from watchmen_utilities import ArrayHelper


class AchievementShaper(EntityShaper):
	def serialize(self, achievement: Achievement) -> EntityRow:
		row = {
			'achievement_id': achievement.achievementId,
			'name': achievement.name,
			'description': achievement.description,
			'time_range_type': achievement.timeRangeType,
			'time_range_year': achievement.timeRangeYear,
			'time_range_month': achievement.timeRangeMonth,
			'compare_with_prev_time_range': achievement.compareWithPreviousTimeRange,
			'final_score_is_ratio': achievement.finalScoreIsRatio,
			'indicators': ArrayHelper(achievement.indicators).map(lambda x: x.to_dict()).to_list()
		}
		row = UserBasedTupleShaper.serialize(achievement, row)
		return row

	def deserialize(self, row: EntityRow) -> Achievement:
		achievement = Achievement(
			achievementId=row.get('achievement_id'),
			name=row.get('name'),
			description=row.get('description'),
			timeRangeType=row.get('time_range_type'),
			timeRangeYear=row.get('time_range_year'),
			timeRangeMonth=row.get('time_range_month'),
			compareWithPreviousTimeRange=row.get('compare_with_prev_time_range'),
			finalScoreIsRatio=row.get('final_score_is_ratio'),
			indicators=row.get('indicators')
		)
		# noinspection PyTypeChecker
		achievement: Achievement = UserBasedTupleShaper.deserialize(row, achievement)
		return achievement


ACHIEVEMENT_ENTITY_NAME = 'achievements'
ACHIEVEMENT_ENTITY_SHAPER = AchievementShaper()


class AchievementService(UserBasedTupleService):
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
