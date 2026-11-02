from datetime import datetime
from typing import Optional

from watchmen_utilities import ExtendedBaseModel

from watchmen_model.common import TenantId, UserId


class RevokedToken(ExtendedBaseModel):
	"""
	a revoked jwt token, identified by its jti claim.
	revoked tokens must be rejected until they reach their own expiration,
	then the rows can be removed by the expiry cleaner
	"""
	jti: Optional[str] = None
	userId: Optional[UserId] = None
	tenantId: Optional[TenantId] = None
	expiresAt: Optional[datetime] = None
	revokedAt: Optional[datetime] = None
