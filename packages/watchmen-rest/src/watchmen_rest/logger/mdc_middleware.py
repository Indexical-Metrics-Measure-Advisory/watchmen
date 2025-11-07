from typing import Awaitable, Callable, Optional

from fastapi import Request, Response, HTTPException
from starlette import status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from watchmen_auth import ask_tenant_name_http_header_key
from watchmen_data_kernel.meta import TenantService
from watchmen_rest import get_any_principal
from watchmen_utilities import mdc_put, mdc_clear


class MDCMiddleware(BaseHTTPMiddleware):
    
    def __init__(
            self,
            app: ASGIApp,
            default_tenant: str = "unknown",
            ignore_paths: list[str] = None
    ):
        super().__init__(app)
        self.default_tenant = default_tenant
        self.ignore_paths = ignore_paths or ["/login", "/token/validate/jwt", "/auth/config", "/token/exchange-user"]
        
    
    async def dispatch(
            self,
            request: Request,
            call_next: Callable[[Request], Awaitable[Response]]
    ) -> Optional[Response]:
        try:
            current_path = request.url.path
            if current_path in self.ignore_paths:
                response: Response = await call_next(request)
            else:
                tenant_name = request.headers.get(ask_tenant_name_http_header_key())
                if tenant_name:
                    mdc_put("tenant", tenant_name)
                else:
                   self.get_tenant_by_authentication(request)
                response: Response = await call_next(request)
            
            return response
        finally:
            mdc_clear()
            
    def get_tenant_by_authentication(self, request):
        try:
            principal_service = get_any_principal(request)
            tenant = TenantService(principal_service).find_by_id(principal_service.tenantId)
            if tenant:
                mdc_put("tenant", tenant.name)
            else:
                mdc_put("tenant", self.default_tenant)
        except Exception:
            mdc_put("tenant", self.default_tenant)