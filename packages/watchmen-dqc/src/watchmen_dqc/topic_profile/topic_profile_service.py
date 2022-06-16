from datetime import datetime
from json import loads
from logging import getLogger
from typing import Any, Dict, List, Optional

from pandas_profiling import ProfileReport

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common import DataKernelException
from watchmen_data_kernel.meta import TopicService
from watchmen_data_kernel.service import ask_topic_data_service, ask_topic_storage
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_dqc.common import DqcException
from watchmen_dqc.util import build_data_frame, convert_data_frame_type_by_topic
from watchmen_model.admin import is_raw_topic
from watchmen_model.common import TopicId
from watchmen_model.dqc import TopicProfile
from watchmen_model.pipeline_kernel import TopicDataColumnNames
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaOperator
from watchmen_utilities import ArrayHelper

logger = getLogger(__name__)


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


def get_topic_schema(
		topic_id: TopicId, principal_service: PrincipalService) -> TopicSchema:
	topic_service = get_topic_service(principal_service)
	topic = get_topic_service(principal_service).find_by_id(topic_id)
	if topic is None:
		raise DataKernelException(f'Topic[id={topic_id}] not found.')
	schema = topic_service.find_schema_by_name(topic.name, principal_service.get_tenant_id())
	if schema is None:
		raise DataKernelException(f'Topic[name={topic.name}] not found.')
	return schema


class TopicProfileService:
	def __init__(self, principal_service: PrincipalService):
		self.principalService = principal_service

	def find(self, topic_id: TopicId, start_time: datetime, end_time: datetime) -> Optional[TopicProfile]:
		schema = get_topic_schema(topic_id, self.principalService)
		if is_raw_topic(schema.get_topic()):
			raise DqcException(f'Raw topic[name={schema.get_topic().name}] is not supported for profiling.')
		storage = ask_topic_storage(schema, self.principalService)
		service = ask_topic_data_service(schema, storage, self.principalService)
		criteria = [
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName=TopicDataColumnNames.TENANT_ID.value),
				right=self.principalService.get_tenant_id()),
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName=TopicDataColumnNames.UPDATE_TIME.value),
				operator=EntityCriteriaOperator.GREATER_THAN_OR_EQUALS,
				right=start_time),
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName=TopicDataColumnNames.UPDATE_TIME.value),
				operator=EntityCriteriaOperator.LESS_THAN_OR_EQUALS,
				right=end_time)
		]
		data = service.find(criteria)

		columns = [
			TopicDataColumnNames.ID.value,
			*ArrayHelper(schema.get_topic().factors).map(lambda x: x.name).to_list(),
			TopicDataColumnNames.TENANT_ID.value,
			TopicDataColumnNames.INSERT_TIME.value,
			TopicDataColumnNames.UPDATE_TIME.value
		]

		def row_to_list(row: Dict[str, Any]) -> List[Any]:
			return ArrayHelper(columns).map(lambda x: row.get(x)).to_list()

		data_frame = build_data_frame(ArrayHelper(data).map(row_to_list).to_list(), columns)
		data_frame = convert_data_frame_type_by_topic(data_frame, schema.get_topic())
		data_frame.drop([
			TopicDataColumnNames.TENANT_ID,
			TopicDataColumnNames.UPDATE_TIME,
			TopicDataColumnNames.INSERT_TIME,
			TopicDataColumnNames.AGGREGATE_ASSIST,
			TopicDataColumnNames.ID,
			TopicDataColumnNames.VERSION
		], axis=1, inplace=True, errors='ignore')

		if data_frame.empty or len(data_frame.index) == 1:
			return None
		else:
			logger.info(f'memory_usage {data_frame.memory_usage(deep=True).sum()} bytes')
			profile = ProfileReport(data_frame, title=f'{schema.get_topic().name} data profile report', minimal=True)
			json_data = profile.to_json()
			json_constants_map = {
				'-Infinity': float('-Infinity'),
				'Infinity': float('Infinity'),
				'NaN': None,
			}
			return loads(json_data, parse_constant=lambda x: json_constants_map[x])
