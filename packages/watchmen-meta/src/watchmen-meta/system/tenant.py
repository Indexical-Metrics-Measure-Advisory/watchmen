from typing import Optional

from watchmen_model.common import DataPage, TenantId
from watchmen_model.system import Tenant


def create_tenant(tenant: Tenant) -> Tenant:
	pass


def update_tenant(tenant: Tenant) -> Tenant:
	pass


def delete_tenant(tenant_id: TenantId) -> Optional[Tenant]:
	pass


def find_tenant_by_id(tenant_id: TenantId) -> Optional[Tenant]:
	pass


def find_tenant_by_word(word: Optional[str]) -> DataPage:
	pass
