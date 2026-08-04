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
    so no real auth/storage layer is invoked.
    """
    app = FastAPI()
    for router in routers:
        app.include_router(router)
    p = principal or admin_principal()
    app.dependency_overrides[get_admin_principal] = admin or p
    app.dependency_overrides[get_console_principal] = console or p
    app.dependency_overrides[get_any_principal] = p
    return TestClient(app)
