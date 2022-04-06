from datetime import datetime
from typing import Any, Dict, List

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common import ask_datetime_formats, DataKernelException
from watchmen_data_kernel.meta import TopicService
from watchmen_data_kernel.service import ask_topic_data_service, ask_topic_storage
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_model.dqc import MonitorRuleLog, MonitorRuleLogCriteria
from watchmen_model.pipeline_kernel import TopicDataColumnNames
from watchmen_storage import ColumnNameLiteral, EntityColumnAggregateArithmetic, EntityCriteriaExpression, \
	EntityCriteriaOperator, EntityStraightAggregateColumn, EntityStraightColumn
from watchmen_utilities import ArrayHelper, is_date, is_not_blank


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


def get_topic_schema(
		topic_name: str, principal_service: PrincipalService) -> TopicSchema:
	schema = get_topic_service(principal_service).find_schema_by_name(topic_name, principal_service.get_tenant_id())
	if schema is None:
		raise DataKernelException(f'Topic[name={topic_name}] not found.')
	return schema


class MonitorDataService:
	def __init__(self, principal_service: PrincipalService):
		self.principalService = principal_service

	def find(self, criteria: MonitorRuleLogCriteria) -> List[MonitorRuleLog]:
		schema = get_topic_schema('dqc_rule_daily', self.principalService)
		storage = ask_topic_storage(schema, self.principalService)
		service = ask_topic_data_service(schema, storage, self.principalService)
		storage_criteria = [
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName=TopicDataColumnNames.TENANT_ID.value),
				right=self.principalService.get_tenant_id())
		]
		if is_not_blank(criteria.ruleCode):
			# noinspection SpellCheckingInspection
			storage_criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='rulecode'), right=criteria.ruleCode.value))
		if is_not_blank(criteria.topicId):
			# noinspection SpellCheckingInspection
			storage_criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='topicid'), right=criteria.topicId))
		if is_not_blank(criteria.factorId):
			# noinspection SpellCheckingInspection
			storage_criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='factorid'), right=criteria.factorId))

		if is_not_blank(criteria.startDate):
			parsed, start_date = is_date(criteria.startDate, ask_datetime_formats())
			if parsed:
				if isinstance(start_date, datetime):
					start_date = start_date.replace(microsecond=0, tzinfo=None)
				else:
					start_date = datetime(
						year=start_date.year, month=start_date.month, day=start_date.day,
						hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
				storage_criteria.append(EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName='processdate'),
					operator=EntityCriteriaOperator.GREATER_THAN_OR_EQUALS,
					right=start_date
				))
			else:
				raise DataKernelException(f'Cannot parse given start date[{criteria.startDate}].')

		if is_not_blank(criteria.endDate):
			parsed, end_date = is_date(criteria.endDate, ask_datetime_formats())
			if parsed:
				if isinstance(end_date, datetime):
					end_date = end_date.replace(microsecond=999999, tzinfo=None)
				else:
					end_date = datetime(
						year=end_date.year, month=end_date.month, day=end_date.day,
						hour=23, minute=59, second=59, microsecond=999999, tzinfo=None)
				storage_criteria.append(EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName='processdate'),
					operator=EntityCriteriaOperator.LESS_THAN_OR_EQUALS,
					right=end_date
				))
			else:
				raise DataKernelException(f'Cannot parse given end date[{criteria.startDate}].')

		# noinspection SpellCheckingInspection
		columns = [
			EntityStraightColumn(columnName='rulecode'),
			EntityStraightAggregateColumn(
				columnName='count', alias='occurredtimes',
				arithmetic=EntityColumnAggregateArithmetic.COUNT),
			EntityStraightAggregateColumn(
				columnName=TopicDataColumnNames.UPDATE_TIME.value, alias='lastoccurred',
				arithmetic=EntityColumnAggregateArithmetic.MAX),
		]
		if is_not_blank(criteria.topicId):
			# noinspection SpellCheckingInspection
			columns.append(EntityStraightColumn(columnName='topicid'))
			# noinspection SpellCheckingInspection
			columns.append(EntityStraightColumn(columnName='factorid'))
		elif is_not_blank(criteria.ruleCode):
			# noinspection SpellCheckingInspection
			columns.append(EntityStraightColumn(columnName='topicid'))

		data = service.find_straight_values(criteria=storage_criteria, columns=columns)

		def to_log(row: Dict[str, Any]) -> MonitorRuleLog:
			# noinspection SpellCheckingInspection
			return MonitorRuleLog(
				ruleCode=row.get('rulecode'),
				topicId=row.get('topicid'),
				factorId=row.get('factorid'),
				count=row.get('occurredtimes'),
				lastOccurredTime=row.get('lastoccurred')
			)

		return ArrayHelper(data).map(lambda x: to_log(x)).to_list()
