"""Shared test infrastructure for the metricflow metric service test suite.

Centralises sys.path bootstrap, principal stubs, model fixtures and mock
service factories so every test module can focus on assertions only.
"""
import os
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

# Keep the snowflake generator from touching a real meta storage on import.
os.environ.setdefault('SNOWFLAKE_COMPETITIVE_WORKERS', 'false')

_PACKAGE_ROOT = Path(__file__).resolve().parents[1]
_SRC_ROOT = _PACKAGE_ROOT / "src"
if str(_SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(_SRC_ROOT))

_PACKAGES_ROOT = _PACKAGE_ROOT.parent
for _package_dir in _PACKAGES_ROOT.iterdir():
    _src_dir = _package_dir / "src"
    if _src_dir.exists() and str(_src_dir) not in sys.path:
        sys.path.insert(0, str(_src_dir))

from fastapi import FastAPI
from fastapi.testclient import TestClient

from watchmen_rest import get_admin_principal, get_console_principal, get_any_principal

from watchmen_metricflow.meta.metrics_meta_service import MetricService
from watchmen_metricflow.meta.metric_category_meta_service import CategoryService
from watchmen_metricflow.meta.metric_subscription_meta_service import SubscriptionService
from watchmen_metricflow.model.metrics import MetricWithCategory
from watchmen_metricflow.model.metric_category import Category
from watchmen_metricflow.model.metric_subscription import Subscription

TENANT_ID = 'tenant-1'
USER_ID = 'user-1'


# --------------------------------------------------------------------------- #
# Principal stubs
# --------------------------------------------------------------------------- #

def admin_principal():
    """A principal with full admin privileges (tenant + super admin)."""
    stub = SimpleNamespace()
    stub.tenantId = TENANT_ID
    stub.userId = USER_ID
    stub.get_tenant_id = lambda: TENANT_ID
    stub.get_user_id = lambda: USER_ID
    stub.is_tenant_admin = lambda: True
    stub.is_super_admin = lambda: True
    return stub


def console_principal(*, is_admin=True):
    """A console principal; is_admin controls the tenant-admin flag."""
    stub = SimpleNamespace()
    stub.tenantId = TENANT_ID
    stub.userId = USER_ID
    stub.get_tenant_id = lambda: TENANT_ID
    stub.get_user_id = lambda: USER_ID
    stub.is_tenant_admin = lambda: is_admin
    stub.is_super_admin = lambda: False
    return stub


# --------------------------------------------------------------------------- #
# Model fixtures
# --------------------------------------------------------------------------- #

def make_metric(name='m1', metric_type='simple', **overrides):
    """Build a MetricWithCategory instance with sensible defaults."""
    data = {
        'name': name,
        'type': metric_type,
        'type_params': {'measure': {'name': 'order_total'}},
    }
    data.update(overrides)
    return MetricWithCategory.model_validate(data)


def make_metric_dict(name='m1', metric_type='simple', **overrides):
    """Return a JSON-serialisable dict for a metric (for request bodies)."""
    data = {
        'name': name,
        'type': metric_type,
        'type_params': {'measure': {'name': 'order_total'}},
    }
    data.update(overrides)
    return data


# ---- Type-specific fixtures (cover all 5 MetricType values) ---- #

def make_simple_metric(name='simple_sales', measure='order_total', **overrides):
    """Simple metric: type_params.measure."""
    data = {
        'name': name,
        'type': 'simple',
        'type_params': {'measure': {'name': measure}},
    }
    data.update(overrides)
    return MetricWithCategory.model_validate(data)


def make_ratio_metric(name='avg_order', numerator='order_total', denominator='order_count',
                      numerator_fill=None, **overrides):
    """Ratio metric: type_params.numerator + denominator."""
    num = {'name': numerator}
    if numerator_fill is not None:
        num['fill_Nones_with'] = numerator_fill
    data = {
        'name': name,
        'type': 'ratio',
        'type_params': {
            'numerator': num,
            'denominator': {'name': denominator},
        },
    }
    data.update(overrides)
    return MetricWithCategory.model_validate(data)


def make_cumulative_metric(name='ytd_sales', measure='order_total',
                           grain_to_date='year', window=None, **overrides):
    """Cumulative metric: type_params.measure + grain_to_date or window."""
    type_params = {'measure': {'name': measure}}
    if grain_to_date:
        type_params['grain_to_date'] = grain_to_date
    if window:
        type_params['window'] = window
    data = {
        'name': name,
        'type': 'cumulative',
        'type_params': type_params,
    }
    data.update(overrides)
    return MetricWithCategory.model_validate(data)


def make_derived_metric(name='doubled_sales', expr='total * 2',
                        metric_refs=None, **overrides):
    """Derived metric: type_params.expr + type_params.metrics (MetricRef list)."""
    if metric_refs is None:
        metric_refs = [{'name': 'total'}]
    data = {
        'name': name,
        'type': 'derived',
        'type_params': {
            'expr': expr,
            'metrics': metric_refs,
        },
    }
    data.update(overrides)
    return MetricWithCategory.model_validate(data)


def make_conversion_metric(name='conv_rate', **overrides):
    """Conversion metric: type_params.conversion_type_params."""
    data = {
        'name': name,
        'type': 'conversion',
        'type_params': {
            'conversion_type_params': {},
        },
    }
    data.update(overrides)
    return MetricWithCategory.model_validate(data)


def make_metric_with_all_fields(name='full_metric', **overrides):
    """A metric with every optional field populated (filter, metadata, label,
    config, time_granularity, categoryId, validationStatus, validationResult).

    Useful for testing MetricShaper serialize/deserialize completeness.
    """
    data = {
        'name': name,
        'type': 'simple',
        'description': 'metric with all fields',
        'type_params': {
            'measure': {'name': 'order_total', 'filter': None, 'alias': 'm1',
                        'join_to_timespine': False, 'fill_Nones_with': None},
            'input_measures': [{'name': 'order_total'}, {'name': 'order_count'}],
        },
        'filter': "{{ Dimension('region') }} = 'APAC'",
        'metadata': {'owner': 'team-a', 'priority': 'high'},
        'label': 'sales',
        'config': {'meta': {'unit': 'USD', 'decimal': 2}},
        'time_granularity': 'day',
        'categoryId': 'cat-1',
        'validationStatus': 'validated',
        'validationResult': {
            'status': 'validated',
            'logs': [
                {'step': 'init', 'status': 'ok', 'message': 'started',
                 'timestamp': '2024-01-01T00:00:00'},
            ],
            'dimension_count': 3,
            'sample_value': 99.5,
            'last_validated_at': '2024-01-01T00:00:00',
            'error': None,
        },
    }
    data.update(overrides)
    return MetricWithCategory.model_validate(data)


def make_category(name='c1', **overrides):
    """Build a Category instance with sensible defaults."""
    data = {'id': 'cat-1', 'name': name}
    data.update(overrides)
    return Category.model_validate(data)


def make_category_dict(name='c1', **overrides):
    """Return a JSON-serialisable dict for a category."""
    data = {'id': 'cat-1', 'name': name}
    data.update(overrides)
    return data


def make_subscription(subscription_id='sub-1', analysis_id='an-1', **overrides):
    """Build a Subscription instance with sensible defaults."""
    data = {
        'id': subscription_id,
        'analysisId': analysis_id,
        'frequency': 'day',
    }
    data.update(overrides)
    return Subscription.model_validate(data)


def make_subscription_dict(subscription_id='sub-1', analysis_id='an-1', **overrides):
    """Return a JSON-serialisable dict for a subscription."""
    data = {
        'id': subscription_id,
        'analysisId': analysis_id,
        'frequency': 'day',
    }
    data.update(overrides)
    return data


# --------------------------------------------------------------------------- #
# Mock service factories
# --------------------------------------------------------------------------- #

def mock_metric_service():
    """A MagicMock with the MetricService spec; next_id returns an int."""
    service = mock.MagicMock(spec=MetricService)
    service.snowflakeGenerator.next_id.return_value = 1001
    return service


def mock_category_service():
    """A MagicMock with the CategoryService spec."""
    service = mock.MagicMock(spec=CategoryService)
    service.snowflakeGenerator.next_id.return_value = 2001
    return service


def mock_subscription_service():
    """A MagicMock with the SubscriptionService spec."""
    service = mock.MagicMock(spec=SubscriptionService)
    service.snowflakeGenerator.next_id.return_value = 3001
    return service


# --------------------------------------------------------------------------- #
# TestClient / FastAPI app builder
# --------------------------------------------------------------------------- #

def build_client(*routers, principal=None, admin=None, console=None):
    """Mount the given routers on a throwaway FastAPI app and return a TestClient.

    Dependency overrides wire every principal resolver to the supplied stubs
    so no real auth/storage layer is invoked.  Values must be callables
    because FastAPI invokes the override to obtain the dependency value.
    """
    app = FastAPI()
    for router in routers:
        app.include_router(router)
    p = principal or admin_principal()
    app.dependency_overrides[get_admin_principal] = lambda: admin or p
    app.dependency_overrides[get_console_principal] = lambda: console or p
    app.dependency_overrides[get_any_principal] = lambda: p
    return TestClient(app)
