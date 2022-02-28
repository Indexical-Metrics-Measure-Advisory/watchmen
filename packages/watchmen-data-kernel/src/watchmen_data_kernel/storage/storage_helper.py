from watchmen_auth import PrincipalService
from watchmen_data_kernel.cache import CacheService
from watchmen_data_kernel.common import DataKernelException
from watchmen_data_kernel.meta import DataSourceService
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_storage import TopicDataStorageSPI
from watchmen_utilities import is_blank
from .topic_storage import build_topic_data_storage


def get_data_source_service(principal_service: PrincipalService) -> DataSourceService:
	return DataSourceService(principal_service)


def ask_topic_storage(schema: TopicSchema, principal_service: PrincipalService) -> TopicDataStorageSPI:
	topic = schema.get_topic()
	data_source_id = topic.dataSourceId
	if is_blank(data_source_id):
		raise DataKernelException(
			f'Data source is not defined for topic[id={topic.topicId}, name={topic.name}]')

	build = CacheService.data_source().get_builder(data_source_id)
	if build is not None:
		return build()

	data_source = get_data_source_service(principal_service).find_by_id(data_source_id)
	if data_source is None:
		raise DataKernelException(
			f'Data source not declared for topic'
			f'[id={topic.topicId}, name={topic.name}, dataSourceId={data_source_id}]')

	build = build_topic_data_storage(data_source)
	CacheService.data_source().put_builder(data_source_id, build)
	return build()
