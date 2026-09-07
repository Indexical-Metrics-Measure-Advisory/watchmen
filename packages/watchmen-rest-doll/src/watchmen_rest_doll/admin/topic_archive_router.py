from typing import List, Optional

from fastapi import APIRouter, Body, Depends

from watchmen_auth import PrincipalService
from watchmen_data_kernel.archive import TopicArchiveExecutor, TopicArchiveResult
from watchmen_data_kernel.common import DataKernelException
from watchmen_meta.admin import ArchiveBatchService, TopicArchivePolicyService, TopicService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import ArchiveBatch, ArchiveBatchStatus, TopicArchivePolicy, TopicArchivePolicyId, \
	UserRole
from watchmen_model.common import DataPage, DataSourceId, Pageable, TenantId, TopicId
from watchmen_rest import get_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404, validate_tenant_id
from watchmen_rest_doll.doll import ask_tuple_delete_enabled
from watchmen_rest_doll.util import trans, trans_readonly
from watchmen_utilities import ExtendedBaseModel, is_blank

router = APIRouter()


def get_topic_archive_policy_service(principal_service: PrincipalService) -> TopicArchivePolicyService:
	return TopicArchivePolicyService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_archive_batch_service(principal_service: PrincipalService) -> ArchiveBatchService:
	return ArchiveBatchService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


class TopicArchivePolicyCriteria(Pageable):
	topicId: Optional[TopicId]


class QueryTopicArchivePolicyDataPage(DataPage):
	data: List[TopicArchivePolicy]


class ArchiveBatchCriteria(Pageable):
	topicId: Optional[TopicId]
	status: Optional[List[ArchiveBatchStatus]]


class QueryArchiveBatchDataPage(DataPage):
	data: List[ArchiveBatch]


class TopicArchiveRunRequest(ExtendedBaseModel):
	topicId: Optional[TopicId] = None
	policyId: Optional[TopicArchivePolicyId] = None
	dryRun: bool = True
	maxBatches: int = 10


def find_topic_data_source_id(topic_id: TopicId, policy_service: TopicArchivePolicyService) -> Optional[DataSourceId]:
	topic_service = TopicService(
		policy_service.storage, policy_service.snowflakeGenerator, policy_service.principalService)
	topic = topic_service.find_by_id(topic_id)
	if topic is None:
		raise_400(f'Topic[id={topic_id}] not found.')
	return topic.dataSourceId


# noinspection DuplicatedCode
def validate_policy(policy: TopicArchivePolicy, policy_service: TopicArchivePolicyService) -> None:
	if is_blank(policy.topicId):
		raise_400('Topic id is required.')
	if policy.hotDays is None or policy.hotDays < 1:
		raise_400('Hot days must be a positive number.')
	if policy.batchSize is None or policy.batchSize < 1 or policy.batchSize > 100000:
		raise_400('Batch size must be between 1 and 100000.')
	if is_blank(policy.archiveDataSourceId):
		raise_400('Archive data source is required.')
	topic_data_source_id = find_topic_data_source_id(policy.topicId, policy_service)
	if policy.archiveDataSourceId == topic_data_source_id:
		raise_400(
			f'Archive data source[id={policy.archiveDataSourceId}] must be different '
			f'from the data source[id={topic_data_source_id}] of topic[id={policy.topicId}]. '
			f'Archived data is moved into another storage, declare a different data source first.')


@router.post('/topic/archive/policy/list', tags=[UserRole.ADMIN], response_model=None)
async def find_policies_page(
		criteria: TopicArchivePolicyCriteria = Body(...),
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> QueryTopicArchivePolicyDataPage:
	policy_service = get_topic_archive_policy_service(principal_service)

	def action() -> QueryTopicArchivePolicyDataPage:
		tenant_id: TenantId = principal_service.get_tenant_id()
		# noinspection PyTypeChecker
		return policy_service.find_page_by_topic(criteria.topicId, tenant_id, criteria)

	return trans_readonly(policy_service, action)


@router.post('/topic/archive/policy', tags=[UserRole.ADMIN], response_model=None)
async def save_policy(
		policy: TopicArchivePolicy, principal_service: PrincipalService = Depends(get_admin_principal)
) -> TopicArchivePolicy:
	validate_tenant_id(policy, principal_service)
	policy_service = get_topic_archive_policy_service(principal_service)

	def action() -> TopicArchivePolicy:
		validate_policy(policy, policy_service)

		if policy_service.is_storable_id_faked(policy.policyId):
			policy_service.redress_storable_id(policy)
			# one topic has at most one policy
			existing: List[TopicArchivePolicy] = \
				policy_service.find_by_topic(policy.topicId, principal_service.get_tenant_id())
			if len(existing) != 0:
				raise_400(f'Topic[id={policy.topicId}] has an archive policy already.')
			# noinspection PyTypeChecker
			return policy_service.create(policy)
		else:
			# noinspection PyTypeChecker
			existing_policy: Optional[TopicArchivePolicy] = policy_service.find_by_id(policy.policyId)
			if existing_policy is None:
				raise_404()
			if existing_policy.tenantId != policy.tenantId:
				raise_403()
			# noinspection PyTypeChecker
			return policy_service.update(policy)

	return trans(policy_service, action)


@router.delete('/topic/archive/policy', tags=[UserRole.ADMIN], response_model=None)
async def delete_policy(
		policy_id: Optional[TopicArchivePolicyId],
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> None:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(policy_id):
		raise_400('Policy id is required.')

	policy_service = get_topic_archive_policy_service(principal_service)

	def action() -> None:
		# noinspection PyTypeChecker
		existing_policy: Optional[TopicArchivePolicy] = policy_service.find_by_id(policy_id)
		if existing_policy is None:
			raise_404()
		policy_service.delete(policy_id)

	trans(policy_service, action)


@router.post('/topic/archive/batch/list', tags=[UserRole.ADMIN], response_model=None)
async def find_batches_page(
		criteria: ArchiveBatchCriteria = Body(...),
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> QueryArchiveBatchDataPage:
	batch_service = get_archive_batch_service(principal_service)

	def action() -> QueryArchiveBatchDataPage:
		tenant_id: TenantId = principal_service.get_tenant_id()
		# noinspection PyTypeChecker
		return batch_service.find_page_by_topic(criteria.topicId, criteria.status, tenant_id, criteria)

	return trans_readonly(batch_service, action)


@router.post('/topic/archive/run', tags=[UserRole.ADMIN], response_model=None)
async def run_archive(
		request: TopicArchiveRunRequest = Body(...),
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> TopicArchiveResult:
	policy_service = get_topic_archive_policy_service(principal_service)

	def action() -> TopicArchivePolicy:
		if not is_blank(request.policyId):
			# noinspection PyTypeChecker
			policy: Optional[TopicArchivePolicy] = policy_service.find_by_id(request.policyId)
			if policy is None:
				raise_404()
			return policy
		elif not is_blank(request.topicId):
			policies: List[TopicArchivePolicy] = \
				policy_service.find_by_topic(request.topicId, principal_service.get_tenant_id())
			if len(policies) == 0:
				raise_400(f'Topic[id={request.topicId}] has no archive policy.')
			return policies[0]
		else:
			raise_400('Topic id or policy id is required.')

	policy: TopicArchivePolicy = trans_readonly(policy_service, action)
	executor = TopicArchiveExecutor(principal_service)
	try:
		return executor.run(policy, dry_run=request.dryRun, max_batches=request.maxBatches)
	except DataKernelException as e:
		raise_400(str(e))
