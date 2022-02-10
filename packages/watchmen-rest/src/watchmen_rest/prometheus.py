from fastapi import FastAPI

from .settings import RestSettings


def install_prometheus(app: FastAPI, settings: RestSettings) -> None:
	from starlette_prometheus import metrics, PrometheusMiddleware
	app.add_middleware(PrometheusMiddleware)
	app.add_route(settings.PROMETHEUS_CONTEXT, metrics)
