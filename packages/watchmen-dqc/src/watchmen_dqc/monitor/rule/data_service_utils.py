from datetime import datetime
from logging import getLogger
from typing import Any, Optional, Tuple

from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import TopicService
from watchmen_data_kernel.service import ask_topic_data_service, ask_topic_storage
from watchmen_data_kernel.storage import TopicDataService
from watchmen_dqc.common import DqcException
from watchmen_model.admin import Factor
from watchmen_model.common import FactorId, TopicId
from watchmen_model.dqc import MonitorRule
from watchmen_model.pipeline_kernel import TopicDataColumnNames
from watchmen_storage import ColumnNameLiteral, EntityCriteria, EntityCriteriaExpression, EntityCriteriaJoint, \
	EntityCriteriaJointConjunction, EntityCriteriaOperator
from watchmen_utilities import ArrayHelper, is_blank

logger = getLogger(__name__)


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


def exchange_topic_data_service(data_service: TopicDataService, topic_id: TopicId) -> TopicDataService:
	principal_service = data_service.get_principal_service()
	topic_service = get_topic_service(principal_service)
	topic = topic_service.find_by_id(topic_id)
	if topic is None:
		raise DqcException(f'Topic[id={topic_id}] not found.')
	schema = topic_service.find_schema_by_name(topic.name, principal_service.get_tenant_id())
	if schema is None:
		raise DqcException(f'Topic[name={topic.name}] not found.')
	storage = ask_topic_storage(schema, principal_service)
	return ask_topic_data_service(schema, storage, data_service.get_principal_service())


def find_factor(
		data_service: TopicDataService, factor_id: Optional[FactorId],
		rule: MonitorRule) -> Tuple[bool, Optional[Factor]]:
	if is_blank(factor_id):
		logger.error(f'Factor id not declared on rule[{rule.dict()}].')
		return False, None
	topic = data_service.get_topic()
	factor = ArrayHelper(topic.factors).find(lambda x: x.factorId == factor_id)
	if factor is None:
		logger.error(f'Factor[id={factor_id}] on rule[{rule.dict()}] not found.')
		return False, None
	else:
		return True, factor


def build_date_range_criteria(date_range: Tuple[datetime, datetime]) -> EntityCriteria:
	return [
		EntityCriteriaExpression(
			left=ColumnNameLiteral(columnName=TopicDataColumnNames.UPDATE_TIME.value),
			operator=EntityCriteriaOperator.GREATER_THAN_OR_EQUALS,
			right=date_range[0]
		),
		EntityCriteriaExpression(
			left=ColumnNameLiteral(columnName=TopicDataColumnNames.UPDATE_TIME.value),
			operator=EntityCriteriaOperator.LESS_THAN_OR_EQUALS,
			right=date_range[1]
		)
	]


def build_column_name_literal(factor: Factor, data_service: TopicDataService) -> ColumnNameLiteral:
	return ColumnNameLiteral(columnName=data_service.get_data_entity_helper().get_column_name(factor.name))


def less_than(factor: Factor, data_service: TopicDataService, value: Any) -> EntityCriteriaExpression:
	return EntityCriteriaExpression(
		left=build_column_name_literal(factor, data_service),
		operator=EntityCriteriaOperator.LESS_THAN,
		right=value
	)


def out_of_range(factor: Factor, data_service: TopicDataService, min_value: Any, max_value: Any) -> EntityCriteriaJoint:
	left = build_column_name_literal(factor, data_service)
	return EntityCriteriaJoint(
		conjunction=EntityCriteriaJointConjunction.OR,
		children=[
			EntityCriteriaExpression(left=left, operator=EntityCriteriaOperator.LESS_THAN, right=min_value),
			EntityCriteriaExpression(left=left, operator=EntityCriteriaOperator.GREATER_THAN, right=max_value)
		]
	)
