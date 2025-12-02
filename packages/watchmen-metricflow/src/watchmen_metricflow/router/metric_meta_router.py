from fastapi import APIRouter
from fastapi import Depends, Body
from typing import List, Optional

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_metricflow.meta.metrics_meta_service import MetricService
from watchmen_metricflow.model.metrics import Metric, MetricWithCategory
from watchmen_model.common import DataPage, Pageable, TenantId
from watchmen_rest import get_admin_principal, get_console_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_metricflow.settings import ask_tuple_delete_enabled
from watchmen_metricflow.util import trans, trans_readonly
from watchmen_utilities import is_blank

router = APIRouter()


def get_metric_service(principal_service: PrincipalService) -> MetricService:
    return MetricService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


class QueryMetricDataPage(DataPage):
    data: List[Metric]


@router.get('/metric/{metric_name}', tags=['CONSOLE', 'ADMIN'], response_model=None)
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
        return metric
    
    return trans_readonly(metric_service, action)


@router.post('/metric', tags=['ADMIN'], response_model=None)
async def create_metric(
        metric: MetricWithCategory,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> MetricWithCategory:
    """Create a new metric"""
    if is_blank(metric.name):
        raise_400('Metric name is required.')
    
    # Set tenant ID from principal
    metric.tenantId = principal_service.tenantId

    
    metric_service = get_metric_service(principal_service)
    metric.id = str(metric_service.snowflakeGenerator.next_id())
    def action() -> Metric:
        # Check if metric with same name already exists
        existing_metric = metric_service.find_by_name(metric.name, metric.tenantId)
        if existing_metric:
            raise_400(f'Metric with name "{metric.name}" already exists.')
        
        return metric_service.create(metric)
    
    return trans(metric_service, action)


@router.put('/metric/{metric_name}', tags=['ADMIN'], response_model=None)
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
    
    def action() -> Metric:
        # Check if metric exists
        existing_metric = metric_service.find_by_name(metric_name, metric.tenantId)
        if existing_metric is None:
            raise_404('Metric not found.')
        metric.id = existing_metric.id
        return metric_service.update(metric)
    
    return trans(metric_service, action)


@router.delete('/metric/{metric_name}', tags=['ADMIN'], response_model=None)
async def delete_metric(
        metric_name: str,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> MetricWithCategory:
    """Delete a metric"""
    if not ask_tuple_delete_enabled():
        raise_404('Not Found')
    
    if is_blank(metric_name):
        raise_400('Metric name is required.')
    
    metric_service = get_metric_service(principal_service)
    
    def action() -> Metric:
        tenant_id: TenantId = principal_service.get_tenant_id()
        
        # Check if metric exists
        existing_metric = metric_service.find_by_name(metric_name, tenant_id)
        if existing_metric is None:
            raise_404('Metric not found.')
        
        return metric_service.delete_by_name(metric_name, tenant_id)
    
    return trans(metric_service, action)


@router.get('/metrics/by-type/{metric_type}', tags=['CONSOLE', 'ADMIN'], response_model=None)
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
        return metric_service.find_by_type(metric_type, tenant_id)
    
    return trans_readonly(metric_service, action)


@router.get('/metrics/by-label/{label}', tags=['CONSOLE', 'ADMIN'], response_model=None)
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
        return metric_service.find_by_label(label, tenant_id)
    
    return trans_readonly(metric_service, action)


@router.get('/metrics/all', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_all_metrics(
        principal_service: PrincipalService = Depends(get_console_principal)
) -> List[MetricWithCategory]:
    """Get all metrics"""
    metric_service = get_metric_service(principal_service)
    
    def action() -> List[MetricWithCategory]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        return metric_service.find_all(tenant_id)
    
    return trans_readonly(metric_service, action)


@router.post('/metrics/name', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def find_metrics_page_by_name(
        query_name: Optional[str], 
        pageable: Pageable = Body(...),
        principal_service: PrincipalService = Depends(get_console_principal)
) -> QueryMetricDataPage:
    """Find metrics by name with pagination"""
    metric_service = get_metric_service(principal_service)
    
    def action() -> QueryMetricDataPage:
        tenant_id: TenantId = principal_service.get_tenant_id()
        
        if is_blank(query_name):
            metrics = metric_service.find_all(tenant_id)
        else:
            # For partial name matching, we'll get all metrics and filter
            all_metrics = metric_service.find_all(tenant_id)
            metrics = [m for m in all_metrics if query_name.lower() in m.name.lower()]
        
        # Simple pagination simulation
        start = (pageable.pageNumber - 1) * pageable.pageSize
        end = start + pageable.pageSize
        page_data = metrics[start:end] if start < len(metrics) else []
        
        return QueryMetricDataPage(
            data=page_data,
            itemCount=len(page_data),
            pageNumber=pageable.pageNumber,
            pageSize=pageable.pageSize,
            pageCount=(len(metrics) + pageable.pageSize - 1) // pageable.pageSize
        )
    
    return trans_readonly(metric_service, action)


@router.get('/metrics/list/name', tags=['ADMIN'], response_model=None)
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




    