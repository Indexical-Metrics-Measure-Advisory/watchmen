from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_metricflow.lineage.metric_lineage_service import MetricLineageService
from watchmen_metricflow.lineage.metric_lineage_models import MetricLineageViewData
from watchmen_rest import get_console_principal
from watchmen_rest.util import raise_400
from watchmen_utilities import is_blank


router = APIRouter()


@router.get('/metricflow/metrics/lineage', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_metric_lineage(
        metric: str,
        includeDiagnostics: bool = True,
        principal_service: PrincipalService = Depends(get_console_principal)
) -> MetricLineageViewData:
    if is_blank(metric):
        raise_400('Metric name is required.')

    service = MetricLineageService(principal_service)
    return service.get_metric_lineage(metric_name=metric, tenant_id=principal_service.get_tenant_id(),
                                      include_diagnostics=includeDiagnostics)
