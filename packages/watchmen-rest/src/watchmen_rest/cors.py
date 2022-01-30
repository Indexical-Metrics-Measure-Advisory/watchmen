from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .rest_settings import RestSettings


def install_cors(app: FastAPI, settings: RestSettings) -> None:
	app.add_middleware(
		CORSMiddleware,
		allow_origins=settings.CORS_ALLOWED_ORIGINS,
		allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
		allow_methods=settings.CORS_ALLOWED_METHODS,
		allow_headers=settings.CORS_ALLOWED_HEADERS,
	)
