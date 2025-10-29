from fastapi import FastAPI
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import  Response
from .settings import RestSettings
class OptionsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if request.method == "OPTIONS":
            return Response(
                status_code=200,
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        return await call_next(request)


def install_cors(app: FastAPI, settings: RestSettings) -> None:
	from fastapi.middleware.cors import CORSMiddleware
	app.add_middleware(OptionsMiddleware)
	app.add_middleware(
		CORSMiddleware,
		allow_origins=settings.CORS_ALLOWED_ORIGINS,
		allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
		allow_methods=settings.CORS_ALLOWED_METHODS,
		allow_headers=settings.CORS_ALLOWED_HEADERS,
	)
