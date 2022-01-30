from fastapi import FastAPI
from starlette_prometheus import metrics, PrometheusMiddleware

from .rest_settings import RestSettings


def install_prometheus(app: FastAPI, settings: RestSettings) -> None:
	app.add_middleware(PrometheusMiddleware)
	app.add_route(settings.PROMETHEUS_CONTEXT, metrics)
