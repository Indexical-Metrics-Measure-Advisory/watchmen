from watchmen_meta.common import UserBasedTupleService, UserBasedTupleShaper, AuditableShaper
from watchmen_storage import EntityShaper, EntityRow, EntityCriteriaExpression, ColumnNameLiteral
from ..model.metric_subscription import Subscription


class SubscriptionShaper(UserBasedTupleShaper):
	def serialize(self, subscription: Subscription) -> EntityRow:
		row = {
			'id': subscription.id,
			'analysis_id': subscription.analysisId,
			'frequency': subscription.frequency,
			'interval': subscription.interval,
			'time': subscription.time,
			'date': subscription.date,
			'weekday': subscription.weekday,
			'day_of_month': subscription.dayOfMonth,
			'month': subscription.month,
			'recipients': subscription.recipients,
			'enabled': subscription.enabled
		}
		row = AuditableShaper.serialize(subscription, row)
		row = UserBasedTupleShaper.serialize(subscription, row)
		return row

	def deserialize(self, row: EntityRow) -> Subscription:
		subscription = Subscription(
			id=row.get('id'),
			analysisId=row.get('analysis_id'),
			frequency=row.get('frequency'),
			interval=row.get('interval'),
			time=row.get('time'),
			date=row.get('date'),
			weekday=row.get('weekday'),
			dayOfMonth=row.get('day_of_month'),
			month=row.get('month'),
			recipients=row.get('recipients'),
			enabled=row.get('enabled')
		)
		# noinspection PyTypeChecker
		subscription: Subscription = AuditableShaper.deserialize(row, subscription)
		# noinspection PyTypeChecker
		subscription: Subscription = UserBasedTupleShaper.deserialize(row, subscription)
		return subscription


SUBSCRIPTION_ENTITY_NAME = 'metric_subscriptions'
SUBSCRIPTION_ENTITY_SHAPER = SubscriptionShaper()


class SubscriptionService(UserBasedTupleService):
	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> str:
		return SUBSCRIPTION_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return SUBSCRIPTION_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> str:
		return 'id'

	def get_storable_id(self, storable: Subscription) -> str:
		return storable.id

	def set_storable_id(self, storable: Subscription, storable_id: str) -> Subscription:
		storable.id = storable_id
		return storable

	def find_by_analysis_id(self, analysis_id: str, tenant_id: str) -> list[Subscription]:
		return self.storage.find(self.get_entity_finder(
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='analysis_id'), right=analysis_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)
			]
		))

	def find_by_tenant_id(self, tenant_id: str) -> list[Subscription]:
		return self.storage.find(self.get_entity_finder(
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)
			]
		))
