import yaml
from fastapi import APIRouter
from fastapi import Depends, Body, Request, Response
from logging import getLogger
from typing import List, Optional, Tuple

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_metricflow.meta.metric_access_service import check_metric_allowed, filter_metrics_allowed
from watchmen_metricflow.meta.metrics_meta_service import MetricService
from watchmen_metricflow.meta.semantic_meta_service import SemanticModelService
from watchmen_metricflow.meta.metric_version_meta_service import MetricVersionService
from watchmen_metricflow.model.metrics import Metric, MetricWithCategory, MetricPublishStatus, MetricVersion, \
    MetricVersionOperationType, MetricTypeParams
from watchmen_model.common import DataPage, Pageable, TenantId
from watchmen_rest import get_admin_principal, get_console_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_metricflow.settings import ask_tuple_delete_enabled
from watchmen_metricflow.util import trans, trans_readonly, trans_with_tail
from watchmen_utilities import ExtendedBaseModel, is_blank
from watchmen_metricflow.cache.metric_config_cache import metric_config_cache


logger = getLogger(__name__)

router = APIRouter()


def find_metrics_visible_to(
        metric_service: MetricService, principal_service: PrincipalService, tenant_id: TenantId
) -> List[MetricWithCategory]:
    metrics = metric_service.find_all(tenant_id)
    if principal_service.is_tenant_admin() or principal_service.is_super_admin():
        return metrics
    # Console users: published metrics only, no semantic-model linkage required.
    published_metrics = [m for m in metrics if m.publishStatus == MetricPublishStatus.PUBLISHED]
    # Console users can only see the metrics assigned to their user groups.
    published_metrics = filter_metrics_allowed(published_metrics, metric_service, principal_service)
    logger.info('Console metric visibility: total[{0}] -> published[{1}].'.format(
        len(metrics), len(published_metrics)))
    return published_metrics


def get_metric_service(principal_service: PrincipalService) -> MetricService:
    return MetricService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_metric_version_service(metric_service: MetricService) -> MetricVersionService:
    # share the storage of metric service so that both writes join the same transaction
    return MetricVersionService(metric_service.storage, metric_service.snowflakeGenerator,
                                metric_service.principalService)


def check_published_lock(existing_metric: MetricWithCategory) -> None:
    if existing_metric.publishStatus == MetricPublishStatus.PUBLISHED:
        raise_400('Published metric cannot be modified. Roll back first.')


class QueryMetricDataPage(DataPage):
    data: List[Metric]


class MetricVersionDataPage(DataPage):
    data: List[MetricVersion]


class MetricPublishBody(ExtendedBaseModel):
    # publish note, optional
    comments: Optional[str] = None


class MetricRollbackBody(ExtendedBaseModel):
    # rollback reason, required
    comments: str
    # restore content of the given version instead of the current one
    targetVersionNo: Optional[int] = None


class MetricAgentUpsertResult(ExtendedBaseModel):
    """YAML agent-upsert result: action + the effective metric (with id and publish fields)"""
    action: str
    dryRun: bool
    metric: Optional[dict] = None


@router.get('/metricflow/metric/{metric_name}', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_metric_by_name(
        metric_name: str,
        principal_service: PrincipalService = Depends(get_console_principal)
) -> MetricWithCategory:
    """Get a specific metric by name"""
    if is_blank(metric_name):
        raise_400('Metric name is required.')
    
    metric_service = get_metric_service(principal_service)
    
    def action() -> Metric:
        tenant_id: TenantId = principal_service.get_tenant_id()
        metric = metric_service.find_by_name(metric_name, tenant_id)
        if metric is None:
            raise_404()
        check_metric_allowed(metric, metric_service, principal_service)
        return metric

    return trans_readonly(metric_service, action)


@router.get('/metricflow/metric/name/yaml/agent-view', tags=['CONSOLE', 'ADMIN'], response_class=Response)
@router.get('/metricflow/metric/name/yaml', tags=['CONSOLE', 'ADMIN'], response_class=Response)
async def get_metric_yaml_by_name(
        metric_name: Optional[str],
        principal_service: PrincipalService = Depends(get_console_principal)
) -> Response:
    if is_blank(metric_name):
        raise_400('Metric name is required.')

    metric_service = get_metric_service(principal_service)

    def action() -> Metric:
        tenant_id: TenantId = principal_service.get_tenant_id()
        metric = metric_service.find_by_name(metric_name, tenant_id)
        if metric is None:
            raise_404()
        check_metric_allowed(metric, metric_service, principal_service)
        return metric

    metric = trans_readonly(metric_service, action)
    yaml_str = yaml.dump(metric.model_dump(mode='json', by_alias=True, exclude_none=True), sort_keys=False)
    return Response(content=yaml_str, media_type='application/x-yaml')


def collect_referenced_measure_names(metric: Metric) -> List[str]:
    """All measure names referenced by the metric type params"""
    type_params = metric.type_params
    if type_params is None:
        return []
    names = []
    for ref in (type_params.measure, type_params.numerator, type_params.denominator):
        if ref is not None and not is_blank(ref.name):
            names.append(ref.name)
    names.extend(ref.name for ref in (type_params.input_measures or []) if not is_blank(ref.name))
    cumulative = type_params.cumulative_type_params
    if cumulative is not None and cumulative.measure is not None and not is_blank(cumulative.measure.name):
        names.append(cumulative.measure.name)
    return names


def collect_referenced_metric_names(metric: Metric) -> List[str]:
    """All base metric names referenced by the metric type params"""
    type_params = metric.type_params
    if type_params is None:
        return []
    names = [ref.name for ref in (type_params.metrics or []) if not is_blank(ref.name)]
    cumulative = type_params.cumulative_type_params
    if cumulative is not None and cumulative.metric is not None and not is_blank(cumulative.metric.name):
        names.append(cumulative.metric.name)
    return names


def prepare_metric_upsert(
        metric: MetricWithCategory, metric_service: MetricService) -> Tuple[str, MetricWithCategory]:
    """Prepare upsert by name, return (action_type, effective metric). action_type: 'create' or 'update'.

    Publish fields are managed only by the publish/rollback endpoints: forced blank on create,
    inherited from the existing metric on update.
    """
    existing_metric = metric_service.find_by_name(metric.name, metric.tenantId)
    if existing_metric is None:
        if is_blank(metric.id):
            metric.id = str(metric_service.snowflakeGenerator.next_id())
        # a new metric always starts as draft, publish must go through the publish endpoint
        metric.publishStatus = None
        metric.publishedVersionNo = None
        metric.lastPublishedAt = None
        return 'create', metric

    check_published_lock(existing_metric)
    metric.id = existing_metric.id
    # publish status is managed only by the publish/rollback endpoints
    metric.publishStatus = existing_metric.publishStatus
    metric.publishedVersionNo = existing_metric.publishedVersionNo
    metric.lastPublishedAt = existing_metric.lastPublishedAt
    return 'update', metric


def validate_metric_references(metric: Metric, metric_service: MetricService) -> None:
    """Hard-validate cross-object references, shared by dry-run and persist.

    Every referenced measure must exist in some semantic model of the tenant, every referenced
    base metric must already exist (mirrors the doll topic agent-upsert validations).
    """
    tenant_id: TenantId = metric.tenantId

    # share the in-transaction storage so all reads join the same transaction
    semantic_model_service = SemanticModelService(
        metric_service.storage, metric_service.snowflakeGenerator, metric_service.principalService)
    known_measure_names = set()
    for model in semantic_model_service.find_all(tenant_id):
        # stored semantic models keep nested measures as plain dicts (ExtendedBaseModel raw-input quirk)
        for measure in (model.measures or []):
            name = measure.get('name') if isinstance(measure, dict) else measure.name
            if not is_blank(name):
                known_measure_names.add(name)
    missing_measures = sorted({name for name in collect_referenced_measure_names(metric)
                               if name not in known_measure_names})
    if missing_measures:
        raise_400(f'Measure[{", ".join(missing_measures)}] not found in any semantic model of tenant[{tenant_id}].')

    known_metric_names = {m.name for m in metric_service.find_all(tenant_id) if m.id != metric.id}
    missing_metrics = sorted({name for name in collect_referenced_metric_names(metric)
                              if name not in known_metric_names})
    if missing_metrics:
        raise_400(f'Metric[{", ".join(missing_metrics)}] not found in tenant[{tenant_id}]. Import the base metric first.')


@router.post('/metricflow/metric/yaml/agent-upsert', tags=['ADMIN'], response_class=Response)
@router.post('/metricflow/metric/yaml', tags=['ADMIN'], response_class=Response)
async def save_metric_yaml(
        request: Request,
        dry_run: bool = False,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> Response:
    """
    Upsert a metric by name from a raw YAML body.

    Args:
      - dry_run: when true, only validate without persisting; returns would_create / would_update
    """
    yaml_bytes = await request.body()
    yaml_str = yaml_bytes.decode('utf-8')
    try:
        metric_dict = yaml.safe_load(yaml_str)
        metric = MetricWithCategory.model_validate(metric_dict)
        # ExtendedBaseModel re-assigns raw input over validated nested models,
        # so type_params (and everything under it) arrives as plain dicts
        metric.type_params = MetricTypeParams.model_validate(metric.type_params)
    except Exception as e:
        raise_400(f'Invalid YAML: {str(e)}')

    if is_blank(metric.name):
        raise_400('Metric name is required.')

    metric.tenantId = principal_service.get_tenant_id()
    metric_service = get_metric_service(principal_service)

    if dry_run:
        # dry-run: read-only transaction, only query and validate
        def do_prepare():
            action_type, effective_metric = prepare_metric_upsert(metric, metric_service)
            validate_metric_references(metric, metric_service)
            return action_type, effective_metric

        action_type, effective_metric = trans_readonly(metric_service, do_prepare)
        result = MetricAgentUpsertResult(
            action=f'would_{action_type}', dryRun=True,
            metric=effective_metric.model_dump(mode='json', by_alias=True, exclude_none=True))
    else:
        # persist: read-write transaction, invalidate metric config cache post-commit
        def do_save():
            action_type, effective_metric = prepare_metric_upsert(metric, metric_service)
            validate_metric_references(metric, metric_service)
            if action_type == 'create':
                metric_result = metric_service.create(effective_metric)
            else:
                metric_result = metric_service.update(effective_metric)
            return (action_type, metric_result), lambda: metric_config_cache.remove(metric.tenantId)

        action_type, saved_metric = trans_with_tail(metric_service, do_save)
        result = MetricAgentUpsertResult(
            action=action_type, dryRun=False,
            metric=saved_metric.model_dump(mode='json', by_alias=True, exclude_none=True))

    result_yaml = yaml.dump(result.model_dump(mode='json', by_alias=True, exclude_none=True), sort_keys=False)
    return Response(content=result_yaml, media_type='application/x-yaml')




@router.post('/metricflow/metric', tags=['ADMIN'], response_model=None)
async def create_metric(
        metric: MetricWithCategory,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> MetricWithCategory:
    """Create a new metric"""
    if is_blank(metric.name):
        raise_400('Metric name is required.')
    
    # Set tenant ID from principal
    metric.tenantId = principal_service.tenantId

    # metric = add_input_measure(metric)

    
    metric_service = get_metric_service(principal_service)
    metric.id = str(metric_service.snowflakeGenerator.next_id())
    # a new metric always starts as draft, publish must go through the publish endpoint
    metric.publishStatus = None
    metric.publishedVersionNo = None
    metric.lastPublishedAt = None

    def action():
        # Check if metric with same name already exists
        existing_metric = metric_service.find_by_name(metric.name, metric.tenantId)
        if existing_metric:
            raise_400(f'Metric with name "{metric.name}" already exists.')
        
        metric_result = metric_service.create(metric)
        return metric_result, lambda: metric_config_cache.remove(metric.tenantId)
    
    return trans_with_tail(metric_service, action)


@router.put('/metricflow/metric/{metric_name}', tags=['ADMIN'], response_model=None)
async def update_metric(
        metric_name: str,
        metric: MetricWithCategory,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> MetricWithCategory:
    """Update an existing metric"""
    if is_blank(metric_name):
        raise_400('Metric name is required.')
    
    # Set tenant ID from principal
    metric.tenantId = principal_service.get_tenant_id()
    
    metric_service = get_metric_service(principal_service)
    
    def action():
        # Check if metric exists
        existing_metric = metric_service.find_by_name(metric_name, metric.tenantId)
        if existing_metric is None:
            raise_404('Metric not found.')

        check_published_lock(existing_metric)
        metric.id = existing_metric.id
        # publish status is managed only by the publish/rollback endpoints
        metric.publishStatus = existing_metric.publishStatus
        metric.publishedVersionNo = existing_metric.publishedVersionNo
        metric.lastPublishedAt = existing_metric.lastPublishedAt
        metric_result = metric_service.update(metric)
        return metric_result, lambda: metric_config_cache.remove(metric.tenantId)
    
    return trans_with_tail(metric_service, action)


@router.delete('/metricflow/metric/{metric_name}', tags=['ADMIN'], response_model=None)
async def delete_metric(
        metric_name: str,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> MetricWithCategory:
    """Delete a metric"""
    
    if is_blank(metric_name):
        raise_400('Metric name is required.')
    
    metric_service = get_metric_service(principal_service)
    
    def action():
        tenant_id: TenantId = principal_service.get_tenant_id()
        
        # Check if metric exists
        existing_metric = metric_service.find_by_name(metric_name, tenant_id)
        if existing_metric is None:
            raise_404('Metric not found.')

        check_published_lock(existing_metric)

        metric_result = metric_service.delete_by_name(metric_name, tenant_id)
        return metric_result, lambda: metric_config_cache.remove(tenant_id)
    
    return trans_with_tail(metric_service, action)


@router.get('/metricflow/metrics/by-type/{metric_type}', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_metrics_by_type(
        metric_type: str,
        principal_service: PrincipalService = Depends(get_console_principal)
) -> List[MetricWithCategory]:
    """Get all metrics of a specific type"""
    if is_blank(metric_type):
        raise_400('Metric type is required.')
    
    metric_service = get_metric_service(principal_service)
    
    def action() -> List[Metric]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        metrics = metric_service.find_by_type(metric_type, tenant_id)
        return filter_metrics_allowed(metrics, metric_service, principal_service)

    return trans_readonly(metric_service, action)


@router.get('/metricflow/metrics/by-label/{label}', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_metrics_by_label(
        label: str,
        principal_service: PrincipalService = Depends(get_console_principal)
) -> List[MetricWithCategory]:
    """Get all metrics with a specific label"""
    if is_blank(label):
        raise_400('Label is required.')
    
    metric_service = get_metric_service(principal_service)
    
    def action() -> List[MetricWithCategory]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        metrics = metric_service.find_by_label(label, tenant_id)
        return filter_metrics_allowed(metrics, metric_service, principal_service)

    return trans_readonly(metric_service, action)


@router.get('/metricflow/metrics/all', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_all_metrics(
        principal_service: PrincipalService = Depends(get_console_principal)
) -> List[MetricWithCategory]:
    """Get all metrics"""
    metric_service = get_metric_service(principal_service)

    def action() -> List[MetricWithCategory]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        return find_metrics_visible_to(metric_service, principal_service, tenant_id)

    return trans_readonly(metric_service, action)


@router.get('/metricflow/metric/all/yaml/agent-view', tags=['ADMIN'], response_class=Response)
@router.get('/metricflow/metrics/all/yaml/agent-view', tags=['ADMIN'], response_class=Response)
async def get_all_metrics_yaml_agent_view(
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> Response:
    metric_service = get_metric_service(principal_service)

    def action() -> List[MetricWithCategory]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        metrics = metric_service.find_all(tenant_id)
        # only published metrics can be exported to runtime
        return [m for m in metrics if m.publishStatus == MetricPublishStatus.PUBLISHED]

    metrics = trans_readonly(metric_service, action)
    yaml_str = yaml.dump([m.model_dump(mode='json', by_alias=True, exclude_none=True) for m in metrics], sort_keys=False)
    return Response(content=yaml_str, media_type='application/x-yaml')


@router.post('/metricflow/metrics/name', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def find_metrics_page_by_name(
        query_name: Optional[str],
        pageable: Pageable = Body(...),
        principal_service: PrincipalService = Depends(get_console_principal)
) -> QueryMetricDataPage:
    """Find metrics by name with pagination"""
    metric_service = get_metric_service(principal_service)

    def action() -> QueryMetricDataPage:
        tenant_id: TenantId = principal_service.get_tenant_id()

        all_metrics = find_metrics_visible_to(metric_service, principal_service, tenant_id)

        if is_blank(query_name):
            metrics = all_metrics
        else:
            # For partial name matching, we'll get all metrics and filter
            metrics = [m for m in all_metrics if query_name.lower() in m.name.lower()]

        # Simple pagination simulation
        start = (pageable.pageNumber - 1) * pageable.pageSize
        end = start + pageable.pageSize
        page_data = metrics[start:end] if start < len(metrics) else []

        return QueryMetricDataPage(
            data=page_data,
            itemCount=len(metrics),
            pageNumber=pageable.pageNumber,
            pageSize=pageable.pageSize,
            pageCount=(len(metrics) + pageable.pageSize - 1) // pageable.pageSize
        )

    return trans_readonly(metric_service, action)


@router.get('/metricflow/metrics/list/name', tags=['ADMIN'], response_model=None)
async def find_metrics_by_name(
        query_name: Optional[str],
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> List[Metric]:
    """Find metrics by name"""
    metric_service = get_metric_service(principal_service)
    
    def action() -> List[Metric]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        
        if is_blank(query_name):
            return metric_service.find_all(tenant_id)
        else:
            # For partial name matching, we'll get all metrics and filter
            all_metrics = metric_service.find_all(tenant_id)
            return [m for m in all_metrics if query_name.lower() in m.name.lower()]
    
    return trans_readonly(metric_service, action)


@router.post('/metricflow/metrics/ids', tags=['ADMIN'], response_model=None)
async def find_metrics_by_ids(
        metric_ids: List[str] = Body(default=[]),
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> List[MetricWithCategory]:
    if len(metric_ids) == 0:
        return []

    metric_service = get_metric_service(principal_service)

    def action() -> List[MetricWithCategory]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        ids = set(metric_ids)
        return [m for m in metric_service.find_all(tenant_id) if m.id in ids]

    return trans_readonly(metric_service, action)


@router.post('/metricflow/metric/{metric_name}/publish', tags=['ADMIN'], response_model=None)
async def publish_metric(
        metric_name: str,
        body: Optional[MetricPublishBody] = Body(default=None),
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> MetricWithCategory:
    """Publish a metric: snapshot the current definition as a new version and lock the metric"""
    if is_blank(metric_name):
        raise_400('Metric name is required.')

    metric_service = get_metric_service(principal_service)

    def action():
        tenant_id: TenantId = principal_service.get_tenant_id()
        metric = metric_service.find_by_name(metric_name, tenant_id)
        if metric is None:
            raise_404('Metric not found.')
        if metric.publishStatus == MetricPublishStatus.PUBLISHED:
            raise_400('Metric is already published. Roll back before publishing again.')

        version_service = get_metric_version_service(metric_service)
        version_no = version_service.find_max_version_no(metric.id, tenant_id) + 1
        comments = body.comments if body is not None else None
        version = MetricVersion(
            id=str(version_service.snowflakeGenerator.next_id()),
            metricId=metric.id,
            metricName=metric.name,
            versionNo=version_no,
            operationType=MetricVersionOperationType.PUBLISH,
            content=metric_service.get_entity_shaper().serialize(metric),
            comments=comments,
            tenantId=tenant_id,
        )
        version_service.create(version)

        metric.publishStatus = MetricPublishStatus.PUBLISHED
        metric.publishedVersionNo = version_no
        metric.lastPublishedAt = metric_service.now()
        metric_result = metric_service.update(metric)
        return metric_result, lambda: metric_config_cache.remove(tenant_id)

    return trans_with_tail(metric_service, action)


@router.post('/metricflow/metric/{metric_name}/rollback', tags=['ADMIN'], response_model=None)
async def rollback_metric(
        metric_name: str,
        body: MetricRollbackBody = Body(...),
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> MetricWithCategory:
    """Roll back a published metric to draft, recorded as a new version with the required comments;
    when targetVersionNo is given, content of that version is restored"""
    if is_blank(metric_name):
        raise_400('Metric name is required.')
    if body is None or is_blank(body.comments):
        raise_400('Rollback comments are required.')

    metric_service = get_metric_service(principal_service)

    def action():
        tenant_id: TenantId = principal_service.get_tenant_id()
        metric = metric_service.find_by_name(metric_name, tenant_id)
        if metric is None:
            raise_404('Metric not found.')
        if metric.publishStatus != MetricPublishStatus.PUBLISHED:
            raise_400('Only a published metric can be rolled back.')

        version_service = get_metric_version_service(metric_service)
        rollback_from_version_no = metric.publishedVersionNo

        restored_metric = metric
        if body.targetVersionNo is not None:
            target_version = version_service.find_by_metric_id_and_version_no(
                metric.id, body.targetVersionNo, tenant_id)
            if target_version is None:
                raise_400(f'Metric version[{body.targetVersionNo}] not found.')
            restored_metric = metric_service.get_entity_shaper().deserialize(target_version.content)
            # keep the current id and name: metric is addressed by name
            restored_metric.id = metric.id
            restored_metric.name = metric.name

        # after rollback the metric goes back to draft, editable again
        restored_metric.tenantId = tenant_id
        restored_metric.publishStatus = MetricPublishStatus.DRAFT
        restored_metric.publishedVersionNo = None
        restored_metric.lastPublishedAt = None

        version_no = version_service.find_max_version_no(metric.id, tenant_id) + 1
        version = MetricVersion(
            id=str(version_service.snowflakeGenerator.next_id()),
            metricId=metric.id,
            metricName=metric.name,
            versionNo=version_no,
            operationType=MetricVersionOperationType.ROLLBACK,
            content=metric_service.get_entity_shaper().serialize(restored_metric),
            comments=body.comments,
            rollbackFromVersionNo=rollback_from_version_no,
            tenantId=tenant_id,
        )
        version_service.create(version)

        metric_result = metric_service.update(restored_metric)
        return metric_result, lambda: metric_config_cache.remove(tenant_id)

    return trans_with_tail(metric_service, action)


@router.get('/metricflow/metric/{metric_name}/versions', tags=['ADMIN'], response_model=None)
async def get_metric_versions(
        metric_name: str,
        pageNumber: int = 1,
        pageSize: int = 10,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> MetricVersionDataPage:
    """List all versions of a metric, newest first"""
    if is_blank(metric_name):
        raise_400('Metric name is required.')

    metric_service = get_metric_service(principal_service)

    def action() -> MetricVersionDataPage:
        tenant_id: TenantId = principal_service.get_tenant_id()
        metric = metric_service.find_by_name(metric_name, tenant_id)
        if metric is None:
            raise_404('Metric not found.')
        check_metric_allowed(metric, metric_service, principal_service)

        version_service = get_metric_version_service(metric_service)
        page = version_service.find_page_by_metric_id(
            metric.id, tenant_id, Pageable(pageNumber=pageNumber, pageSize=pageSize))
        return MetricVersionDataPage(
            data=page.data,
            itemCount=page.itemCount,
            pageNumber=page.pageNumber,
            pageSize=page.pageSize,
            pageCount=page.pageCount
        )

    return trans_readonly(metric_service, action)


@router.get('/metricflow/metric/{metric_name}/versions/{version_no}', tags=['ADMIN'], response_model=None)
async def get_metric_version_detail(
        metric_name: str,
        version_no: int,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> MetricVersion:
    """Load one version of a metric, with the full metric snapshot inside"""
    if is_blank(metric_name):
        raise_400('Metric name is required.')

    metric_service = get_metric_service(principal_service)

    def action() -> MetricVersion:
        tenant_id: TenantId = principal_service.get_tenant_id()
        metric = metric_service.find_by_name(metric_name, tenant_id)
        if metric is None:
            raise_404('Metric not found.')
        check_metric_allowed(metric, metric_service, principal_service)

        version_service = get_metric_version_service(metric_service)
        version = version_service.find_by_metric_id_and_version_no(metric.id, version_no, tenant_id)
        if version is None:
            raise_404('Metric version not found.')
        return version

    return trans_readonly(metric_service, action)